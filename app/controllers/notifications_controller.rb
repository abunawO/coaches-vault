class NotificationsController < ApplicationController
  before_action :require_login

  def index
    @notifications = current_user.notifications.order(Arel.sql("read_at IS NOT NULL, created_at DESC"))

    case params[:filter]
    when "unread"
      @notifications = @notifications.where(read_at: nil)
    when "read"
      @notifications = @notifications.where.not(read_at: nil)
    end
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

  def destroy
    @notification = current_user.notifications.find(params[:id])
    @notification.destroy
    respond_to do |format|
      format.turbo_stream
      format.html { redirect_to notifications_path, notice: "Notification deleted." }
    end
  end

  private

  def badge_count
    count = current_user.unread_notifications_count
    view_context.render(partial: "shared/nav_badge", locals: { count:, id: "nav_notifications_badge" })
  end
end
