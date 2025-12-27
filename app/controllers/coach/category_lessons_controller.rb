class Coach::CategoryLessonsController < ApplicationController
  before_action :require_login
  before_action :require_coach
  before_action :set_category

  def create
    raw_ids = params.dig(:category, :lesson_ids) || params[:lesson_ids] || params[:lesson_id]
    ids = Array(raw_ids).map(&:presence).compact.map(&:to_i).reject(&:zero?).uniq

    if ids.empty?
      return redirect_to coach_vault_path, alert: "Select at least one lesson."
    end

    added = 0

    ids.each do |lesson_id|
      lesson = current_user.lessons.find_by(id: lesson_id)
      next unless lesson

      join = @category.category_lessons.find_or_create_by(lesson: lesson)
      added += 1 if join.previously_new_record?
    end

    msg =
      if added.positive?
        "Added #{added} lesson#{'s' if added != 1}."
      else
        "No new lessons were added."
      end

    redirect_to coach_vault_path, notice: msg
  end

  def destroy
    # safer than @category.lessons.find(...) because it scopes through the join
    join = @category.category_lessons.find_by!(lesson_id: params[:lesson_id])
    join.destroy

    redirect_to coach_vault_path, notice: "Lesson removed from category."
  end

  private

  def set_category
    @category = current_user.categories.find(params[:category_id])
  end

  def require_coach
    redirect_to root_path, alert: "Access denied" unless current_user&.coach?
  end
end
