class NotificationsController < ApplicationController
  before_action :require_login

  def index
    @notifications = current_user.notifications.order(Arel.sql("read_at IS NOT NULL, created_at DESC"))
  end

  def show
    @notification = current_user.notifications.find(params[:id])
    @notification.update(read_at: Time.current) if @notification.read_at.nil?
    redirect_to @notification.target_path
  end

  def mark_all_read
    current_user.notifications.where(read_at: nil).update_all(read_at: Time.current)
    redirect_back fallback_location: notifications_path, notice: "Notifications marked as read."
  end
end
