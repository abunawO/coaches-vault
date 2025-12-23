module Coach
  class LessonsController < ApplicationController
    before_action :require_coach
    before_action :set_lesson, only: %i[edit update destroy]

    def index
      @lessons = current_user.lessons
    end

    def new
      @lesson = current_user.lessons.build
    end

    def create
      @lesson = current_user.lessons.build(lesson_params)
      if @lesson.save
        redirect_to coach_lessons_path, notice: "Lesson created successfully."
      else
        render :new, status: :unprocessable_entity
      end
    end

    def edit; end

    def update
      if @lesson.update(lesson_params)
        redirect_to coach_lessons_path, notice: "Lesson updated successfully."
      else
        render :edit, status: :unprocessable_entity
      end
    end

    def destroy
      @lesson.destroy
      redirect_to coach_lessons_path, notice: "Lesson deleted successfully."
    end

    private

    def set_lesson
      @lesson = current_user.lessons.find(params[:id])
    end

    def lesson_params
      params.require(:lesson).permit(:title, :description, :video_url, :visibility, :preview, :preview_text)
    end

    def require_coach
      return if logged_in? && current_user.role == "coach"

      redirect_to root_path, alert: "You must be a coach to access that page."
    end
  end
end
