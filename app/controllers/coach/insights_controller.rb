class Coach::InsightsController < ApplicationController
  before_action :require_login
  before_action :require_coach

  def index
    @window_days = 30
    @window_start = @window_days.days.ago

    insights = CoachInsightsQuery.new(coach: current_user, window_start: @window_start).call
    @active_subscribers_count = insights[:active_subscribers_count]
    @new_subscribers_count = insights[:new_subscribers_count]
    @cancellations_count = insights[:cancellations_count]
    @favorites_count = insights[:favorites_count]
    @comments_count = insights[:comments_count]
    @top_lessons = insights[:top_lessons]
    @recent_activity = insights[:recent_activity]
    @inactive_subscriptions = insights[:inactive_subscriptions]
  end

  private

  def require_coach
    return if current_user&.coach?

    redirect_to root_path, alert: "You must be a coach to view insights."
  end
end
