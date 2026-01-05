class Coach::VaultController < ApplicationController
  before_action :require_login
  before_action :require_coach

  def index
    @categories = current_user.categories.includes(:lessons).ordered
    @lessons = current_user.lessons.order(created_at: :desc)
    @category = current_user.categories.build
    @selected_category = @categories.find_by(id: params[:category_id]) || @categories.first
  end
  
  private

  def require_coach
    redirect_to root_path, alert: "Access denied" unless current_user&.coach?
  end
end
