module Coach
  class LessonsController < ApplicationController
    before_action :require_coach
    before_action :set_lesson, only: %i[edit update destroy]
    before_action :load_active_subscribers, only: %i[new create edit update]

    def index
      @lessons = current_user.lessons
    end

    def new
      @lesson = current_user.lessons.build
    end

    def create
      @lesson = current_user.lessons.build(lesson_params.except(:allowed_subscriber_ids))
      if process_visibility_and_shares(@lesson, lesson_params[:allowed_subscriber_ids])
        redirect_to coach_lessons_path, notice: "Lesson created successfully."
      else
        render :new, status: :unprocessable_entity
      end
    end

    def edit; end

    def update
      @lesson.assign_attributes(lesson_params.except(:allowed_subscriber_ids))
      if process_visibility_and_shares(@lesson, lesson_params[:allowed_subscriber_ids])
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
      params.require(:lesson).permit(
        :title,
        :description,
        :video_url,
        :visibility,
        :preview,
        :preview_text,
        allowed_subscriber_ids: [],
        lesson_media_attributes: %i[id kind video_url position _destroy image_file]
      )
    end

    def require_coach
      return if logged_in? && current_user.role == "coach"

      redirect_to root_path, alert: "You must be a coach to access that page."
    end

    def load_active_subscribers
      ids = Subscription.active.where(coach_id: current_user.id).pluck(:student_id)
      @subscribers = User.where(id: ids).order(:email)
      @preselected_allowed_ids =
        if params.dig(:lesson, :allowed_subscriber_ids).present?
          Array(params[:lesson][:allowed_subscriber_ids]).reject(&:blank?).map(&:to_i)
        elsif @lesson&.persisted?
          @lesson.lesson_shares.pluck(:user_id)
        else
          []
        end
    end

    def process_visibility_and_shares(lesson, allowed_ids)
      selected_ids = Array(allowed_ids).reject(&:blank?).map(&:to_i).uniq

      if lesson.visibility == "restricted" && selected_ids.empty?
        lesson.errors.add(:base, "Select at least one subscriber for private visibility.")
        return false
      end

      active_ids = @subscribers.pluck(:id)
      if lesson.visibility == "restricted" && (selected_ids - active_ids).any?
        lesson.errors.add(:base, "You can only share with active subscribers.")
        return false
      end

      Lesson.transaction do
        lesson.save!
        if lesson.visibility == "restricted"
          lesson.lesson_shares.where.not(user_id: selected_ids).delete_all
          selected_ids.each { |sid| lesson.lesson_shares.find_or_create_by!(user_id: sid) }
        else
          lesson.lesson_shares.delete_all
        end
      end
      true
    rescue ActiveRecord::RecordInvalid => e
      lesson.errors.add(:base, e.record.errors.full_messages.to_sentence)
      false
    end
  end
end
