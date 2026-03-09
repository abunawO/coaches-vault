require "set"

class CoachInsightsQuery
  def initialize(coach:, window_start:)
    @coach = coach
    @window_start = window_start
  end

  def call
    active_subscriptions = Subscription
                           .active
                           .where(coach_id: @coach.id)
                           .includes(student: :student_profile)
                           .order(started_at: :desc, created_at: :desc)

    active_student_ids = active_subscriptions.map(&:student_id).uniq

    favorites_recent = Favorite
                       .joins(:lesson)
                       .where(lessons: { coach_id: @coach.id })
                       .where("favorites.created_at >= ?", @window_start)
                       .includes(:lesson)

    comments_recent = Comment
                      .joins(:lesson)
                      .where(lessons: { coach_id: @coach.id })
                      .where("comments.created_at >= ?", @window_start)
                      .includes(:lesson)

    messages_recent = Message
                      .joins(:conversation)
                      .where(conversations: { coach_id: @coach.id })
                      .where(sender_id: User.where(role: "student").select(:id))
                      .where("messages.created_at >= ?", @window_start)

    {
      active_subscribers_count: active_subscriptions.map(&:student_id).uniq.size,
      new_subscribers_count: Subscription.where(coach_id: @coach.id).where("started_at >= ?", @window_start).count,
      cancellations_count: Subscription.canceled.where(coach_id: @coach.id).where("ended_at >= ?", @window_start).count,
      favorites_count: favorites_recent.count,
      comments_count: comments_recent.count,
      top_lessons: top_lessons(favorites_recent: favorites_recent, comments_recent: comments_recent),
      recent_activity: recent_activity(favorites_recent: favorites_recent, comments_recent: comments_recent, messages_recent: messages_recent),
      inactive_subscriptions: inactive_subscriptions(
        active_subscriptions: active_subscriptions,
        active_student_ids: active_student_ids,
        favorites_recent: favorites_recent,
        comments_recent: comments_recent,
        messages_recent: messages_recent
      )
    }
  end

  private

  def top_lessons(favorites_recent:, comments_recent:)
    favorite_counts = favorites_recent.group(:lesson_id).count
    comment_counts = comments_recent.group(:lesson_id).count
    lesson_ids = (favorite_counts.keys + comment_counts.keys).uniq
    lessons_by_id = Lesson.where(coach_id: @coach.id, id: lesson_ids).index_by(&:id)

    lesson_ids.map do |lesson_id|
      lesson = lessons_by_id[lesson_id]
      next unless lesson

      favorites_count = favorite_counts[lesson_id].to_i
      comments_count = comment_counts[lesson_id].to_i
      engagement_count = favorites_count + comments_count

      {
        lesson: lesson,
        favorites_count: favorites_count,
        comments_count: comments_count,
        engagement_count: engagement_count
      }
    end.compact.sort_by { |row| [-row[:engagement_count], -row[:comments_count], -row[:favorites_count], row[:lesson].title] }.first(10)
  end

  def recent_activity(favorites_recent:, comments_recent:, messages_recent:)
    items = []

    favorites_recent.each do |favorite|
      items << {
        type: :favorite,
        occurred_at: favorite.created_at,
        student_id: favorite.student_id,
        lesson: favorite.lesson
      }
    end

    comments_recent.each do |comment|
      items << {
        type: :comment,
        occurred_at: comment.created_at,
        student_id: comment.user_id,
        lesson: comment.lesson
      }
    end

    messages_recent.each do |message|
      items << {
        type: :message,
        occurred_at: message.created_at,
        student_id: message.sender_id,
        conversation_id: message.conversation_id
      }
    end

    student_ids = items.map { |item| item[:student_id] }.uniq
    students_by_id = User.where(id: student_ids).includes(:student_profile).index_by(&:id)

    items.each do |item|
      item[:student] = students_by_id[item[:student_id]]
    end

    items.sort_by { |item| -item[:occurred_at].to_i }.first(25)
  end

  def inactive_subscriptions(active_subscriptions:, active_student_ids:, favorites_recent:, comments_recent:, messages_recent:)
    active_ids_with_activity = Set.new

    favorites_recent.where(student_id: active_student_ids).pluck(:student_id).each { |id| active_ids_with_activity << id }
    comments_recent.where(user_id: active_student_ids).pluck(:user_id).each { |id| active_ids_with_activity << id }
    messages_recent.where(sender_id: active_student_ids).pluck(:sender_id).each { |id| active_ids_with_activity << id }

    active_subscriptions.reject { |subscription| active_ids_with_activity.include?(subscription.student_id) }
  end
end
