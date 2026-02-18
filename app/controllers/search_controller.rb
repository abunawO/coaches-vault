class SearchController < ApplicationController
  skip_before_action :require_login, only: %i[index]

  def index
    @query = params[:q].to_s.strip
    @subscription_coach_ids = current_user&.student? ? Subscription.active.where(student_id: current_user.id).pluck(:coach_id) : []

    @lesson_cards = []
    @coach_results = []

    if @query.present?
      lesson_results = Lesson.includes(
        { coach: :coach_profile },
        { cover_image_attachment: :blob },
        { lesson_media: { image_file_attachment: :blob } }
      ).search(@query)
      @lesson_cards = lesson_results.map do |lesson|
        { lesson: lesson, coach_profile: lesson.coach&.coach_profile, locked: lesson_locked?(lesson) }
      end

      @coach_results = CoachProfile
                       .left_outer_joins(:user)
                       .where("coach_profiles.display_name ILIKE :q OR coach_profiles.bio ILIKE :q OR users.email ILIKE :q", q: like_query)
                       .distinct
                       .order(created_at: :desc)
    end

    if turbo_frame_request?
      render partial: "results_frame", locals: { lesson_cards: @lesson_cards, query: @query }
    end
  end

  private

  def like_query
    "%#{ActiveRecord::Base.sanitize_sql_like(@query)}%"
  end

  def lesson_locked?(lesson)
    return false if current_user&.coach? && lesson.coach_id == current_user.id
    return false if current_user&.student? && @subscription_coach_ids.include?(lesson.coach_id)

    true
  end
end
