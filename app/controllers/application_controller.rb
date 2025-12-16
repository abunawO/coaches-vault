class ApplicationController < ActionController::Base
  # Only allow modern browsers supporting webp images, web push, badges, import maps, CSS nesting, and CSS :has.
  allow_browser versions: :modern

  # Changes to the importmap will invalidate the etag for HTML responses
  stale_when_importmap_changes

  before_action :require_login

  helper_method :current_user, :logged_in?, :can_view_lesson?

  private

  def current_user
    return @current_user if defined?(@current_user)

    @current_user = User.find_by(id: session[:user_id]) if session[:user_id]
  end

  def logged_in?
    current_user.present?
  end

  def can_view_lesson?(lesson)
    return false unless current_user
    return true if lesson.coach_id == current_user.id

    current_user.subscribed_to?(lesson.coach)
  end

  def require_login
    return if logged_in?

    redirect_to login_path, alert: "Please log in to continue."
  end

  def require_student
    return redirect_to login_path, alert: "Please log in to continue." unless logged_in?
    return if current_user.student?

    redirect_to root_path, alert: "You must be a student to do that."
  end
end
