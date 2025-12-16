class DashboardController < ApplicationController
  def index
    @subscription_coach_ids = []

    if current_user.coach?
      @my_lessons = current_user.lessons.order(created_at: :desc)
      @lesson_count = @my_lessons.size
      @recent_lessons = @my_lessons.limit(6)
    else
      if current_user.student?
        @subscription_coach_ids = Subscription.active.where(student_id: current_user.id).pluck(:coach_id)
        @subscription_count = @subscription_coach_ids.size
      end

      @vault_lessons = Lesson.includes(coach: :coach_profile)
                             .order(Arel.sql("RANDOM()"))
                             .limit(24)
    end
  end
end
