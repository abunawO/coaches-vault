class VaultController < ApplicationController
  before_action :require_login

  def index
    @categories = Category.includes(:lessons).ordered.where(coach_id: coach_scope.pluck(:id))
  end

  private

  def coach_scope
    User.coaches
  end
end
