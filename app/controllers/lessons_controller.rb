class LessonsController < ApplicationController
  skip_before_action :require_login, only: %i[index show]
  before_action :set_coach, only: %i[index show]
  before_action :set_lesson, only: %i[show]
  before_action :authorize_lesson_access!, only: %i[show]

  def index
    if current_user&.coach?
      redirect_to coach_lessons_path and return
    end

    @lessons = Lesson.includes(:coach)
    @lessons = @lessons.where(coach: @coach) if @coach
    @lessons = @lessons.all
  end

  def show
    @access_level = @lesson.viewer_access_level(current_user)
    @authorized = @access_level == :full
    @lock_reason = @lesson.lock_reason_for(current_user)
    @can_view_lesson = @access_level == :full
    record_lesson_view_if_needed
    @root_comments = @lesson.comments.includes(:user, replies: :user).where(parent_id: nil)
    @can_comment = @authorized && current_user&.student? && current_user.subscribed_to?(@lesson.coach)
    @can_reply = @authorized && current_user&.coach? && current_user.id == @lesson.coach_id
    @media_slides = @lesson.lesson_media.order(:position)
    @up_next_section = current_section_for_continue_learning
    @up_next = section_scoped_up_next(@up_next_section)
    @up_next_mode = @up_next.any? ? :section : :coach
    @up_next = coach_scoped_up_next if @up_next_mode == :coach
  end

  private

  def set_coach
    return unless params[:slug]

    @coach_profile = CoachProfile.includes(:user).find_by!(slug: params[:slug])
    @coach = @coach_profile.user
  end

  def set_lesson
    scope = Lesson.includes(:coach)
    scope = scope.where(coach: @coach) if @coach

    identifier = params[:lesson_slug] || params[:id]

    @lesson = if params[:lesson_slug].present? && Lesson.column_names.include?("slug")
      scope.find_by!(slug: identifier)
    else
      scope.find(identifier)
    end
  end

  def authorize_lesson_access!
    @access_level = @lesson.viewer_access_level(current_user)
    @lock_reason = @lesson.lock_reason_for(current_user)
    @authorized = @access_level == :full

    return if @access_level == :full || @access_level == :preview

    case @lock_reason
    when :not_logged_in
      redirect_to login_path, alert: "Please log in to view this lesson." and return
    when :not_subscribed
      flash.now[:alert] = "Subscribe to unlock this lesson."
    when :not_shared
      flash.now[:alert] = "This lesson is private and not shared with your account."
    end
  end

  def current_section_for_continue_learning
    requested_category_id = params[:category_id].to_i
    if requested_category_id.positive?
      requested = @lesson
                  .categories
                  .where(coach_id: @lesson.coach_id)
                  .find_by(id: requested_category_id)
      return requested if requested
    end

    @lesson
      .category_lessons
      .joins(:category)
      .includes(:category)
      .where(categories: { coach_id: @lesson.coach_id })
      .order(Arel.sql("COALESCE(category_lessons.position, 2147483647) ASC"), "categories.position ASC", "categories.created_at ASC")
      .first
      &.category
  end

  def section_scoped_up_next(category)
    return [] unless category

    category
      .category_lessons
      .joins(:lesson)
      .includes(lesson: [:coach, :lesson_shares])
      .where.not(lesson_id: @lesson.id)
      .where(lessons: { coach_id: @lesson.coach_id })
      .order(Arel.sql("COALESCE(category_lessons.position, 2147483647) ASC"), "lessons.created_at DESC")
      .limit(24)
      .map(&:lesson)
      .compact
      .select { |lesson| viewable_in_continue_learning?(lesson) }
      .first(6)
  end

  def coach_scoped_up_next
    Lesson
      .includes(:coach, :lesson_shares)
      .where(coach_id: @lesson.coach_id)
      .where.not(id: @lesson.id)
      .order(created_at: :desc)
      .limit(24)
      .select { |lesson| viewable_in_continue_learning?(lesson) }
      .first(6)
  end

  def viewable_in_continue_learning?(lesson)
    [:full, :preview].include?(lesson.viewer_access_level(current_user))
  end

  def record_lesson_view_if_needed
    return unless current_user&.student?
    return unless @access_level == :full
    return if @lesson.coach_id == current_user.id

    now = Time.current
    lesson_view = LessonView.find_or_initialize_by(user_id: current_user.id, lesson_id: @lesson.id)

    if lesson_view.new_record?
      lesson_view.view_count = 1
      lesson_view.first_viewed_at = now
    else
      lesson_view.view_count = lesson_view.view_count.to_i + 1
    end

    lesson_view.last_viewed_at = now
    lesson_view.save!
  rescue ActiveRecord::RecordInvalid => e
    Rails.logger.warn(
      "[lesson_view] skipped user_id=#{current_user&.id} lesson_id=#{@lesson&.id} " \
      "error_class=#{e.class} error_message=#{e.message}"
    )
  end
end
