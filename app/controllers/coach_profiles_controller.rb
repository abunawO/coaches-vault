class CoachProfilesController < ApplicationController
  before_action :require_login
  before_action :require_coach
  before_action :set_coach_profile

  def edit; end

  def update
    if @coach_profile.update(coach_profile_params)
      if params[:coach_profile][:avatar].present?
        @coach_profile.avatar.attach(params[:coach_profile][:avatar])
      end
      redirect_to coach_path(@coach_profile.slug), notice: "Profile updated."
    else
      render :edit, status: :unprocessable_entity
    end
  end

  private

  def require_coach
    return if current_user&.coach?

    redirect_to root_path, alert: "You must be a coach to edit your profile."
  end

  def set_coach_profile
    @coach_profile = current_user.coach_profile
    return if @coach_profile.present?

    slug = current_user.email.split("@").first.parameterize
    slug = "#{slug}-#{SecureRandom.hex(3)}" if CoachProfile.exists?(slug: slug)
    @coach_profile = current_user.create_coach_profile!(
      display_name: current_user.email.split("@").first,
      headline: "Coach",
      slug: slug
    )
  end

  def coach_profile_params
    params.require(:coach_profile).permit(
      :display_name,
      :headline,
      :bio,
      :location,
      :instagram_url,
      :youtube_url,
      :website_url,
      :tiktok_url,
      :avatar
    )
  end
end
