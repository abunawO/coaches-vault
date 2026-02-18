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

  def lesson_thumbnail_url(lesson, size: [1200, 675])
    thumbnail_url = nil
    resize_to_limit = Array(size).presence || [1200, 675]

    begin
      return nil unless lesson

      if lesson.respond_to?(:cover_image) && lesson.cover_image.attached?
        thumbnail_url = url_for(lesson.cover_image.variant(resize_to_limit: resize_to_limit))
      end

      if thumbnail_url.nil? && lesson.respond_to?(:lesson_media)
        media_collection =
          if lesson.lesson_media.respond_to?(:loaded?) && lesson.lesson_media.loaded?
            lesson.lesson_media
          elsif lesson.lesson_media.respond_to?(:with_attached_image_file)
            lesson.lesson_media.with_attached_image_file
          else
            lesson.lesson_media
          end

        image_slide = media_collection.find do |media|
          media.respond_to?(:image?) && media.image? &&
            media.respond_to?(:image_file) && media.image_file.attached?
        end

        if image_slide
          thumbnail_url = url_for(image_slide.image_file.variant(resize_to_limit: resize_to_limit))
        end
      end

      if thumbnail_url.nil?
        legacy_url = lesson.respond_to?(:video_url) ? lesson.video_url.to_s : ""

        youtube_match = legacy_url.match(%r{(?:youtu\.be/|youtube\.com/(?:watch\?(?:.*&)?v=|embed/|shorts/))([\w-]{11})})
        vimeo_match   = legacy_url.match(%r{vimeo\.com/(?:video/)?(\d+)})

        thumbnail_url =
          if youtube_match
            "https://img.youtube.com/vi/#{youtube_match[1]}/hqdefault.jpg"
          elsif vimeo_match
            "https://vumbnail.com/#{vimeo_match[1]}.jpg"
          end
      end
    rescue StandardError => e
      Rails.logger.warn(
        "[lesson_thumbnail_url] lesson_id=#{lesson&.respond_to?(:id) ? lesson.id : 'unknown'} " \
        "error_class=#{e.class} error_message=#{e.message}"
      )
      thumbnail_url = nil
    end

    thumbnail_url
  end
end
