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
        @recommended_system = Dashboard::SystemRecommendationQuery.new(
          user: current_user,
          subscription_coach_ids: @subscription_coach_ids
        ).call
      end

      @feed_lessons = Lesson.includes(
                              :lesson_shares,
                              { coach: :coach_profile },
                              { cover_image_attachment: :blob },
                              { lesson_media: { image_file_attachment: :blob } }
                            )
                            .where.not(visibility: Lesson.visibilities[:restricted])
                            .order(created_at: :desc)
                            .limit(20)

      @lesson_views_by_lesson_id =
        if current_user.student? && @feed_lessons.any?
          LessonView.where(user_id: current_user.id, lesson_id: @feed_lessons.map(&:id)).index_by(&:lesson_id)
        else
          {}
        end
    end
  end
end
