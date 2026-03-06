module Coaches
  class VaultsController < ApplicationController
    def show
      @coach_profile = CoachProfile.find_by!(slug: params[:slug])
      @coach = @coach_profile.user
      @categories = @coach.categories.ordered.includes(category_lessons: { lesson: [:coach, :lesson_media] })
      @subscribed = current_user&.student? && current_user.subscribed_to?(@coach)
      @owning_coach = current_user&.coach? && current_user.id == @coach.id

      @vault_sections = @categories.map do |category|
        ordered_category_lessons = category.category_lessons.sort_by { |category_lesson| category_lesson.position || 0 }
        lessons = ordered_category_lessons.filter_map(&:lesson)

        {
          category: category,
          lessons: lessons,
          total_lessons: lessons.size,
          preview_titles: lessons.first(3).map(&:title),
          taxonomy_label: taxonomy_label_for(category)
        }
      end

      @total_lessons = @vault_sections.sum { |section| section[:total_lessons] }
      @selected_section_id = resolved_selected_section_id
      @start_here_sections = build_start_here_sections
    end

    private

    def resolved_selected_section_id
      candidate = params[:category_id].to_i
      valid_ids = @vault_sections.map { |section| section[:category].id }
      return candidate if valid_ids.include?(candidate)

      valid_ids.first
    end

    def build_start_here_sections
      return [] if @vault_sections.empty?

      foundations = @vault_sections.select { |section| section[:taxonomy_label] == "Fundamentals" }
      list = foundations.first(2)
      remaining = @vault_sections.reject { |section| list.include?(section) }

      list.concat(remaining.first(2)).uniq.first(3)
    end

    def taxonomy_label_for(category)
      source = [category.name, category.description].compact.join(" ").downcase
      return "Fundamentals" if source.match?(/\b(fundamental|foundation|basic|intro|beginner)\b/)
      return "Striking" if source.match?(/\b(striking|boxing|kick|muay thai|punch)\b/)
      return "Grappling" if source.match?(/\b(grappling|wrestling|jiu[- ]?jitsu|bjj|guard|sweep|submission|takedown)\b/)
      return "Conditioning" if source.match?(/\b(conditioning|fitness|strength|mobility|recovery|endurance)\b/)
      return "System" if source.match?(/\b(system|framework|sequence|chain)\b/)
      return "Concept" if source.match?(/\b(concept|principle|theory|idea|mindset)\b/)

      nil
    end
  end
end
