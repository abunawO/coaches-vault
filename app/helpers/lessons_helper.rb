require "uri"

module LessonsHelper
  def lesson_media_kind_label(kind)
    case kind.to_s
    when "image"
      "Image"
    when "video"
      "Video"
    else
      "Media"
    end
  end

  def lesson_media_step_title(slide, index)
    kind = slide.respond_to?(:kind) ? slide.kind.to_s : slide[:kind].to_s

    if kind == "image"
      "Image step #{index + 1}"
    elsif kind == "video"
      video_url = slide.respond_to?(:video_url) ? slide.video_url.to_s : slide[:video_url].to_s
      video_file = slide.respond_to?(:video_file) ? slide.video_file : slide[:video_file]
      if video_file.respond_to?(:attached?) && video_file.attached?
        "Uploaded video step #{index + 1}"
      elsif video_url.present?
        "Embedded video step #{index + 1}"
      else
        "Video step #{index + 1}"
      end
    else
      "Media step #{index + 1}"
    end
  end

  def lesson_media_step_hint(slide)
    kind = slide.respond_to?(:kind) ? slide.kind.to_s : slide[:kind].to_s

    if kind == "image"
      image_file = slide.respond_to?(:image_file) ? slide.image_file : slide[:image_file]
      return image_file.filename.to_s if image_file.respond_to?(:attached?) && image_file.attached?
      return "Image"
    end

    if kind == "video"
      video_file = slide.respond_to?(:video_file) ? slide.video_file : slide[:video_file]
      if video_file.respond_to?(:attached?) && video_file.attached?
        return video_file.filename.to_s
      end

      video_url = slide.respond_to?(:video_url) ? slide.video_url.to_s : slide[:video_url].to_s
      return lesson_media_source_name(video_url) if video_url.present?
    end

    nil
  end

  def lesson_media_source_name(url)
    host = URI.parse(url).host.to_s.downcase
    return "YouTube" if host.include?("youtube") || host.include?("youtu.be")
    return "Vimeo" if host.include?("vimeo")

    host.sub(/^www\./, "").presence || "External video"
  rescue URI::InvalidURIError
    "External video"
  end
end
