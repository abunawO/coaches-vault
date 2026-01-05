module VideoEmbedHelper
  require "uri"
  require "cgi"

  def embed_url_for(url)
    return nil if url.blank?

    uri = URI.parse(url) rescue nil
    return nil unless uri&.host

    host = uri.host.downcase
    path_segments = uri.path.to_s.split("/").reject(&:blank?)
    video_id = nil

    if host.include?("youtube.com") || host.include?("youtu.be")
      if host.include?("youtu.be")
        video_id = path_segments.first
      elsif uri.path&.start_with?("/shorts/")
        video_id = path_segments[1] # after "shorts"
      else
        query_params = CGI.parse(uri.query.to_s)
        video_id = query_params["v"]&.first
      end
      return nil if video_id.blank?
      return "https://www.youtube.com/embed/#{video_id}"
    end

    if host.include?("vimeo.com")
      # Supports vimeo.com/123, vimeo.com/video/123, etc.
      video_id = path_segments.last
      return nil if video_id.blank?
      return "https://player.vimeo.com/video/#{video_id}"
    end

    nil
  end
end
