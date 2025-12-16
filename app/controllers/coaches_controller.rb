class CoachesController < ApplicationController
  skip_before_action :require_login, only: %i[index show]

  def index
    scope = CoachProfile.includes(:user)

    if logged_in? && current_user.coach?
      my_profile_id = current_user.coach_profile&.id
      scope = scope.where.not(id: my_profile_id) if my_profile_id.present?
    end

    @coach_profiles = scope.order(created_at: :desc)
  end

  def show
    @coach_profile = CoachProfile.includes(:user).find_by!(slug: params[:slug])
    @coach = @coach_profile.user
  end
end
