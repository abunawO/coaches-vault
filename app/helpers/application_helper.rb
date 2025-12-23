module ApplicationHelper
  def nav_link_class(path)
    classes = ["topnav__link"]
    classes << "is-active" if current_page?(path)
    classes.join(" ")
  end

  def inbox_tab_class(name, current)
    base = "tab-button"
    name == current ? "#{base} is-active" : base
  end

  def visibility_badge_class(visibility)
    case visibility
    when "free" then "badge badge-success"
    when "subscribers" then "badge badge-neutral"
    when "restricted" then "badge badge-warning"
    else "badge badge-neutral"
    end
  end

  def notifications_label
    count = current_user&.unread_notifications_count.to_i
    count.positive? ? "Notifications (#{count})" : "Notifications"
  end

  def lesson_thumbnail_url(lesson)
    url = lesson.video_url.to_s

    if url =~ /youtu(?:\.be|be\.com)\/.*(?:v=|\/)([\w-]+)/
      "https://img.youtube.com/vi/#{$1}/hqdefault.jpg"
    elsif url =~ %r{vimeo\.com/(\d+)}
      # Basic Vimeo placeholder using the video id; may not always resolve without API, so fallback.
      "https://vumbnail.com/#{$1}.jpg"
    else
      "https://via.placeholder.com/640x360?text=Lesson"
    end
  end
end
