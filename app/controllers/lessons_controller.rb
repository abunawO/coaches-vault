class LessonsController < ApplicationController
  skip_before_action :require_login, only: %i[index show]
  before_action :set_coach, only: %i[index show]
  before_action :set_lesson, only: %i[show]
  before_action :authorize_lesson_access!, only: %i[show]

  def index
    if current_user&.coach?
      @page_title = "My Lessons"
      if current_user.coach_profile.present?
        @lessons = current_user.lessons.order(created_at: :desc)
      else
        flash.now[:alert] = "Create your coach profile to add lessons."
        @lessons = Lesson.none
      end
    else
      @lessons = Lesson.includes(:coach)
      @lessons = @lessons.where(coach: @coach) if @coach
      @lessons = @lessons.all
    end
  end

  def show
    @access_level = @lesson.viewer_access_level(current_user)
    @authorized = @access_level == :full
    @lock_reason = @lesson.lock_reason_for(current_user)
    @can_view_lesson = @access_level == :full
    @root_comments = @lesson.comments.includes(:user, replies: :user).where(parent_id: nil)
    @can_comment = @authorized && current_user&.student? && current_user.subscribed_to?(@lesson.coach)
    @can_reply = @authorized && current_user&.coach? && current_user.id == @lesson.coach_id
    @media_slides = @lesson.lesson_media.order(:position)
    if @media_slides.blank? && @lesson.video_url.present?
      @media_slides = [{ kind: "video", video_url: @lesson.video_url, image_file: nil }]
    end

    # Up next: other lessons from the same coach that the viewer can at least preview/full
    @up_next = Lesson
               .includes(:coach, :lesson_shares)
               .where(coach_id: @lesson.coach_id)
               .where.not(id: @lesson.id)
               .order(created_at: :desc)
               .limit(12)
               .select { |l| [:full, :preview].include?(l.viewer_access_level(current_user)) }
               .first(6)
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
end
