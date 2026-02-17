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
    return nil unless lesson

    if lesson.respond_to?(:cover_image) && lesson.cover_image.attached?
      return url_for(lesson.cover_image.variant(resize_to_limit: [1200, 675]))
    end

    if lesson.respond_to?(:lesson_media)
      image_slide = lesson.lesson_media.detect { |m| m.image? && m.image_file.attached? }
      if image_slide.present?
        return url_for(image_slide.image_file.variant(resize_to_limit: [1200, 675]))
      end
    end

    url = lesson.video_url.to_s
    if url =~ /youtu(?:\.be|be\.com)\/.*(?:v=|\/)([\w-]+)/
      "https://img.youtube.com/vi/#{$1}/hqdefault.jpg"
    elsif url =~ %r{vimeo\.com/(\d+)}
      "https://vumbnail.com/#{$1}.jpg"
    end
  rescue StandardError
    nil
  end
end
