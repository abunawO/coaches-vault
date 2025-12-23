class DashboardController < ApplicationController
  def index
    @subscription_coach_ids = []

    if current_user.coach?
      @my_lessons = current_user.lessons.order(created_at: :desc)
      @lesson_count = @my_lessons.size
      @recent_lessons = @my_lessons.limit(6)
      @subscriber_count = Subscription.active.where(coach_id: current_user.id).distinct.count(:student_id)
    else
      if current_user.student?
        @subscription_coach_ids = Subscription.active.where(student_id: current_user.id).pluck(:coach_id)
        @subscription_count = @subscription_coach_ids.size
      end

      @feed_lessons = Lesson.includes(:lesson_shares, coach: :coach_profile)
                            .where.not(visibility: Lesson.visibilities[:restricted])
                            .order(created_at: :desc)
                            .limit(20)
    end
  end
end
