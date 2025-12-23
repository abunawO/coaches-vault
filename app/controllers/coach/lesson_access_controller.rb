class Coach::LessonAccessController < ApplicationController
  before_action :require_login
  before_action :require_coach
  before_action :set_lesson

  def edit
    load_subscribers
  end

  def update
    visibility = params.dig(:lesson, :visibility)
    selected_ids = Array(params[:selected_user_ids]).map(&:to_i).uniq

    if visibility == "restricted" && selected_ids.empty?
      load_subscribers
      flash.now[:alert] = "Select at least one subscriber for private access."
      return render :edit, status: :unprocessable_entity
    end

    subscriber_ids = active_subscriber_ids
    if visibility == "restricted" && (selected_ids - subscriber_ids).any?
      load_subscribers
      flash.now[:alert] = "You can only share with active subscribers."
      return render :edit, status: :unprocessable_entity
    end

    Lesson.transaction do
      @lesson.update!(visibility: visibility)

      if visibility == "restricted"
        @lesson.lesson_shares.where.not(user_id: selected_ids).delete_all
        selected_ids.each do |sid|
          @lesson.lesson_shares.find_or_create_by!(user_id: sid)
        end
      end
    end

    redirect_to access_coach_lesson_path(@lesson), notice: "Access updated."
  rescue ActiveRecord::RecordInvalid => e
    load_subscribers
    flash.now[:alert] = e.record.errors.full_messages.to_sentence
    render :edit, status: :unprocessable_entity
  end

  private

  def set_lesson
    @lesson = current_user.lessons.find(params[:id])
  end

  def active_subscriber_ids
    Subscription.active.where(coach_id: current_user.id).pluck(:student_id)
  end

  def load_subscribers
    ids = active_subscriber_ids
    @subscribers = User.where(id: ids).order(:email)
    @selected_user_ids = @lesson.lesson_shares.pluck(:user_id)
  end

  def require_coach
    return if current_user&.coach?

    redirect_to root_path, alert: "You must be a coach to do that."
  end
end
