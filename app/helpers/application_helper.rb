module ApplicationHelper
  def nav_link_class(path)
    classes = ["nav-link"]
    classes << "active" if current_page?(path)
    classes.join(" ")
  end

  def notifications_label
    count = current_user&.unread_notifications_count.to_i
    count.positive? ? "Notifications (#{count})" : "Notifications"
  end
end
