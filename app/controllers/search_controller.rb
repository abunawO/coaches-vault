class SearchController < ApplicationController
  skip_before_action :require_login, only: %i[index]

  def index
    @query = params[:q].to_s.strip
    @lesson_results = []
    @coach_results = []
    @subscription_coach_ids = []

    if current_user&.student?
      @subscription_coach_ids = Subscription.active.where(student_id: current_user.id).pluck(:coach_id)
    end

    return if @query.blank?

    @lesson_results = Lesson.includes(coach: :coach_profile).search(@query)
    @coach_results = CoachProfile
                     .left_outer_joins(:user)
                     .where("coach_profiles.display_name ILIKE :q OR coach_profiles.bio ILIKE :q OR users.email ILIKE :q", q: like_query)
                     .distinct
                     .order(created_at: :desc)
  end

  private

  def like_query
    "%#{ActiveRecord::Base.sanitize_sql_like(@query)}%"
  end
end
