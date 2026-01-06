module Coaches
  class VaultsController < ApplicationController
    def show
      @coach_profile = CoachProfile.find_by!(slug: params[:slug])
      @coach = @coach_profile.user
      @categories = @coach.categories.ordered.includes(category_lessons: { lesson: [:coach, :lesson_media] })
    end
  end
end
