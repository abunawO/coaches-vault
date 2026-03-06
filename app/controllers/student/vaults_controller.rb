module Student
  class VaultsController < ApplicationController
    before_action :require_student

    def index
      base_scope = Subscription.active.where(student_id: current_user.id)
      @has_subscriptions = base_scope.exists?
      @q = params[:q].to_s.strip

      scope = base_scope.includes(coach: { coach_profile: { avatar_attachment: :blob } })

      if @q.present?
        like = "%#{ActiveRecord::Base.sanitize_sql_like(@q)}%"
        matching_coach_ids = User
                             .left_outer_joins(:coach_profile)
                             .where(role: "coach")
                             .where(
                               "coach_profiles.display_name ILIKE :q OR coach_profiles.headline ILIKE :q OR coach_profiles.bio ILIKE :q OR coach_profiles.slug ILIKE :q OR users.email ILIKE :q",
                               q: like
                             )
                             .select(:id)
        scope = scope.where(coach_id: matching_coach_ids)
      end

      @subscriptions = scope.order(started_at: :desc, created_at: :desc)

      coach_ids = @subscriptions.map(&:coach_id).uniq
      @lesson_counts_by_coach_id = Lesson.where(coach_id: coach_ids).group(:coach_id).count
    end
  end
end
