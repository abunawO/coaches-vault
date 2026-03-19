class FavoritesController < ApplicationController
  before_action :require_student
  before_action :set_lesson, only: %i[create destroy]

  def index
    @favorites = current_user
      .favorites
      .includes(
        lesson: [
          { coach: :coach_profile },
          { cover_image_attachment: :blob },
          { lesson_media: { image_file_attachment: :blob } }
        ]
      )
      .order(created_at: :desc)
  end

  def create
    current_user.favorites.find_or_create_by!(lesson: @lesson)
    redirect_back fallback_location: favorites_path, notice: "Added to favorites."
  end

  def destroy
    favorite = current_user.favorites.find_by(lesson: @lesson)
    favorite&.destroy
    target = request.referer&.include?(favorites_path) ? favorites_path : lesson_path(@lesson)
    redirect_to target, notice: "Removed from favorites."
  end

  private

  def set_lesson
    @lesson = Lesson.find(params[:lesson_id])
  end
end
