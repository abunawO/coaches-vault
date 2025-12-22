class SubscribersController < ApplicationController
  before_action :require_coach

  def index
    scope = Subscription.active.where(coach_id: current_user.id)
    @subscriber_count = scope.distinct.count(:student_id)
    @subscriptions = scope
                      .select("DISTINCT ON (student_id) subscriptions.*")
                      .order("student_id, created_at DESC")
                      .includes(:student)
  end

  private

  def require_coach
    return if current_user&.coach?

    redirect_to root_path, alert: "You must be a coach to view subscribers."
  end
end
