class Coach::CategoryLessonsController < ApplicationController
  before_action :require_login
  before_action :require_coach
  before_action :set_category
  before_action :load_context, only: [:create, :destroy]

  def create
    raw_ids = params.dig(:category, :lesson_ids) || params[:lesson_ids] || params[:lesson_id]
    ids = Array(raw_ids).map(&:presence).compact.map(&:to_i).reject(&:zero?).uniq

    if ids.empty?
      return respond_with_redirect(alert: "Select at least one lesson.")
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

    respond_with_stream(msg)
  end

  def destroy
    # safer than @category.lessons.find(...) because it scopes through the join
    join = @category.category_lessons.find_by!(lesson_id: params[:lesson_id])
    join.destroy

    respond_with_stream("Lesson removed from category.")
  end

  private

  def set_category
    @category = current_user.categories.find(params[:category_id])
  end

  def require_coach
    redirect_to root_path, alert: "Access denied" unless current_user&.coach?
  end

  def load_context
    @categories = current_user.categories.includes(:lessons).ordered
    @lessons = current_user.lessons.order(created_at: :desc)
    @selected_category = @category
  end

  def respond_with_stream(message)
    respond_to do |format|
      format.turbo_stream do
        @category.reload
        render turbo_stream: [
          turbo_stream.replace(
            "vault_category",
            partial: "coach/vault/category_frame",
            locals: { selected_category: @selected_category, lessons: @lessons }
          ),
          turbo_stream.update(
            "category_#{@category.id}_count",
            helpers.pluralize(@category.lessons.count, "lesson")
          ),
          turbo_stream.update(
            "vault_category_count",
            helpers.pluralize(@category.lessons.count, "lesson")
          ),
          turbo_stream.append(
            "flash-messages",
            partial: "shared/flash",
            locals: { type: :notice, message: message }
          )
        ]
      end
      format.html { redirect_to coach_vault_path(category_id: @category.id), notice: message }
    end
  end

  def respond_with_redirect(alert: nil)
    respond_to do |format|
      format.turbo_stream { render turbo_stream: turbo_stream.replace("vault_category", partial: "coach/vault/category_frame", locals: { selected_category: @selected_category, lessons: @lessons }), status: :unprocessable_entity }
      format.html { redirect_to coach_vault_path(category_id: @category.id), alert: alert }
    end
  end
end
