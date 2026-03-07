class Coach::CategoriesController < ApplicationController
  before_action :require_login
  before_action :require_coach
  before_action :set_category, only: [:update, :destroy]

  def create
    @category = current_user.categories.build(resolved_category_params)
    if @category.save
      redirect_to coach_vault_path, notice: "Category created."
    else
      redirect_to coach_vault_path, alert: @category.errors.full_messages.to_sentence
    end
  end

  def update
    if @category.update(resolved_category_params)
      redirect_to coach_vault_path(category_id: @category.id), notice: "Category updated."
    else
      redirect_to coach_vault_path(category_id: @category.id), alert: @category.errors.full_messages.to_sentence
    end
  end

  def destroy
    @category.destroy
    redirect_to coach_vault_path, notice: "Category deleted."
  end

  private

  def set_category
    @category = current_user.categories.find(params[:id])
  end

  def category_params
    params.require(:category).permit(:name, :category_type, :custom_category_type, :description, :position, :visibility)
  end

  def resolved_category_params
    attrs = category_params.to_h
    selected = attrs["category_type"].to_s
    custom = attrs["custom_category_type"].to_s.strip

    attrs["category_type"] =
      if selected == "__custom__"
        custom
      else
        selected
      end

    attrs.except("custom_category_type")
  end

  def require_coach
    redirect_to root_path, alert: "Access denied" unless current_user&.coach?
  end
end
