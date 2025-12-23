module LessonsHelper
  def lesson_thumbnail_url(lesson)
    url = lesson.video_url.to_s

    if url =~ /youtu(?:\.be|be\.com)\/.*(?:v=|\/)([\w-]+)/
      "https://img.youtube.com/vi/#{$1}/hqdefault.jpg"
    elsif url =~ %r{vimeo\.com/(\d+)}
      "https://vumbnail.com/#{$1}.jpg"
    else
      nil
    end
  end
end
