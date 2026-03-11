module Coaches
  class VaultsController < ApplicationController
    def show
      @coach_profile = CoachProfile.find_by!(slug: params[:slug])
      @coach = @coach_profile.user
      @categories = @coach.categories.ordered.includes(
        category_lessons: {
          lesson: [
            :coach,
            { cover_image_attachment: :blob },
            { lesson_media: { image_file_attachment: :blob } }
          ]
        }
      )
      @subscribed = current_user&.student? && current_user.subscribed_to?(@coach)
      @owning_coach = current_user&.coach? && current_user.id == @coach.id
      @preview_mode = params[:preview].present? && @owning_coach
      @preview_return_to = safe_internal_return_path(params[:return_to], coach_vault_path)

      @vault_sections = @categories.map do |category|
        ordered_category_lessons = category.category_lessons.sort_by { |category_lesson| category_lesson.position || 0 }
        lessons = ordered_category_lessons.filter_map(&:lesson)

        {
          category: category,
          lessons: lessons,
          total_lessons: lessons.size,
          preview_titles: lessons.first(3).map(&:title),
          category_type: category.category_type
        }
      end

      @lesson_views_by_lesson_id = build_lesson_view_lookup

      @total_lessons = @vault_sections.sum { |section| section[:total_lessons] }
      present_types = @vault_sections.map { |section| section[:category_type] }.uniq
      built_in_present = Category::CATEGORY_TYPES.select { |type| present_types.include?(type) }
      custom_present = (present_types - Category::CATEGORY_TYPES).sort
      @available_types = built_in_present + custom_present

      @sections_by_type = @available_types.each_with_object({}) do |type, grouped|
        sections = @vault_sections.select { |section| section[:category_type] == type }
        grouped[type] = sections if sections.any?
      end
      @selected_section_id = resolved_selected_section_id
    end

    private

    def resolved_selected_section_id
      candidate = params[:category_id].to_i
      valid_ids = @vault_sections.map { |section| section[:category].id }
      return candidate if valid_ids.include?(candidate)

      valid_ids.first
    end

    def safe_internal_return_path(candidate, default_path)
      value = candidate.to_s.strip
      return default_path if value.blank?
      return default_path unless value.start_with?("/")
      return default_path if value.start_with?("//")

      value
    end

    def build_lesson_view_lookup
      return {} unless current_user&.student?

      lesson_ids = @vault_sections.flat_map { |section| section[:lessons].map(&:id) }.uniq
      return {} if lesson_ids.empty?

      LessonView.where(user_id: current_user.id, lesson_id: lesson_ids).index_by(&:lesson_id)
    end
  end
end
