module Dashboard
  class SystemRecommendationQuery
    def initialize(user:, subscription_coach_ids:)
      @user = user
      @subscription_coach_ids = Array(subscription_coach_ids).uniq
    end

    def call
      return nil unless @user&.student?
      return nil if @subscription_coach_ids.empty?

      categories = load_categories
      return nil if categories.empty?

      lesson_views_by_lesson_id = load_lesson_views(categories)
      student_context = StudentAccessContext.new(@user.id, @subscription_coach_ids)

      summaries = categories.filter_map do |category|
        summarize_category(category, lesson_views_by_lesson_id, student_context)
      end
      return nil if summaries.empty?

      select_recommendation(summaries)
    end

    private

    StudentAccessContext = Struct.new(:id, :subscribed_coach_ids) do
      def student?
        true
      end

      def subscribed_to?(coach_user)
        return false unless coach_user

        subscribed_coach_ids.include?(coach_user.id)
      end
    end

    def load_categories
      Category
        .where(coach_id: @subscription_coach_ids)
        .ordered
        .includes(
          { coach: :coach_profile },
          category_lessons: {
            lesson: [
              :lesson_shares,
              { cover_image_attachment: :blob },
              { lesson_media: { image_file_attachment: :blob } }
            ]
          }
        )
        .to_a
    end

    def load_lesson_views(categories)
      lesson_ids = categories.flat_map { |category| category.category_lessons.map(&:lesson_id) }.compact.uniq
      return {} if lesson_ids.empty?

      LessonView.where(user_id: @user.id, lesson_id: lesson_ids).index_by(&:lesson_id)
    end

    def summarize_category(category, lesson_views_by_lesson_id, student_context)
      ordered_category_lessons = category.category_lessons.sort_by { |category_lesson| category_lesson.position || 0 }
      lessons = ordered_category_lessons.filter_map(&:lesson)
      return nil if lessons.empty?

      accessible_lessons = lessons.select { |lesson| lesson.viewer_access_level(student_context) == :full }
      return nil if accessible_lessons.empty?

      accessible_lesson_ids = accessible_lessons.map(&:id)
      accessible_views = accessible_lesson_ids.filter_map { |lesson_id| lesson_views_by_lesson_id[lesson_id] }
      viewed_count = accessible_views.count { |lesson_view| lesson_view.view_count.to_i.positive? }
      accessible_count = accessible_lessons.size
      unviewed_count = accessible_count - viewed_count

      completion_state =
        if viewed_count.zero?
          :not_started
        elsif viewed_count < accessible_count
          :in_progress
        else
          :complete
        end

      coach_profile = category.coach&.coach_profile
      return nil if coach_profile&.slug.blank?

      {
        category: category,
        coach_profile: coach_profile,
        coach_name: coach_profile.display_name.presence || category.coach&.email || "Coach",
        representative_lesson: accessible_lessons.first,
        preview_titles: accessible_lessons.first(3).map(&:title),
        lesson_count: accessible_count,
        accessible_count: accessible_count,
        viewed_count: viewed_count,
        unviewed_count: unviewed_count,
        completion_state: completion_state,
        category_last_viewed_at: accessible_views.map(&:last_viewed_at).compact.max,
        latest_accessible_created_at: accessible_lessons.map(&:created_at).compact.max
      }
    end

    def select_recommendation(summaries)
      in_progress = summaries.select do |summary|
        summary[:completion_state] == :in_progress
      end

      if in_progress.any?
        selected = in_progress.max_by do |summary|
          [
            summary[:category_last_viewed_at]&.to_i || 0,
            -summary[:unviewed_count].to_i,
            summary[:accessible_count].to_i,
            summary[:latest_accessible_created_at]&.to_i || 0,
            -(summary[:category].position || 0),
            summary[:category].created_at.to_i
          ]
        end
        return selected.merge(mode: :continue)
      end

      not_started = summaries.select do |summary|
        summary[:completion_state] == :not_started
      end

      if not_started.any?
        selected = not_started.max_by do |summary|
          [
            summary[:latest_accessible_created_at]&.to_i || 0,
            summary[:accessible_count].to_i,
            -(summary[:category].position || 0),
            summary[:category].created_at.to_i
          ]
        end
        return selected.merge(mode: :study)
      end

      fallback = summaries.max_by do |summary|
        [
          summary[:latest_accessible_created_at]&.to_i || 0,
          summary[:accessible_count].to_i,
          summary[:category_last_viewed_at]&.to_i || 0,
          -(summary[:category].position || 0),
          summary[:category].created_at.to_i
        ]
      end

      fallback&.merge(mode: :new_in_vault)
    end
  end
end
