class CoachesController < ApplicationController
  skip_before_action :require_login, only: %i[index show]

  def index
    scope = CoachProfile.left_outer_joins(:user).includes(user: :lessons)

    if params[:q].present?
      q = params[:q].to_s.strip
      like = "%#{ActiveRecord::Base.sanitize_sql_like(q)}%"
      scope = scope.where(
        "coach_profiles.display_name ILIKE :q OR coach_profiles.bio ILIKE :q OR coach_profiles.slug ILIKE :q OR users.email ILIKE :q",
        q: like
      )
    end

    if logged_in? && current_user.coach?
      my_profile_id = current_user.coach_profile&.id
      scope = scope.where.not(id: my_profile_id) if my_profile_id.present?
    end

    @q = params[:q].to_s.strip
    @coach_profiles = scope.order(created_at: :desc)
  end

  def show
    @coach_profile = CoachProfile.includes(:user).find_by!(slug: params[:slug])
    @coach = @coach_profile.user
    @featured_lessons = @coach.lessons
                              .includes(
                                { cover_image_attachment: :blob },
                                { lesson_media: { image_file_attachment: :blob } }
                              )
                              .order(created_at: :desc)
                              .limit(6)
    @latest_lessons = @coach.lessons
                            .includes(
                              { cover_image_attachment: :blob },
                              { lesson_media: { image_file_attachment: :blob } }
                            )
                            .order(created_at: :desc)
                            .limit(5)
  end
end
