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
    @authorized ||= false
    @root_comments = @lesson.comments.includes(:user, replies: :user).where(parent_id: nil)
    @can_comment = current_user&.student? && current_user.subscribed_to?(@lesson.coach)
    @can_reply = current_user&.coach? && current_user.id == @lesson.coach_id
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
    @authorized = logged_in? && can_view_lesson?(@lesson)
    return if @authorized

    unless logged_in?
      redirect_to login_path, alert: "Please log in to view lessons." and return
    end

    flash.now[:alert] = "Subscribe to access this lesson."
  end
end
