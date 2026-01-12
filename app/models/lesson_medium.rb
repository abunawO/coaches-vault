class LessonMedium < ApplicationRecord
  belongs_to :lesson
  has_one_attached :image_file
  has_one_attached :video_file

  enum :kind, { image: 0, video: 1 }

  validates :kind, presence: true
  validate :image_attached_for_image
  validate :video_requirements_for_video
  validate :video_file_validation

  default_scope { order(:position, :created_at) }

  private

  def image_attached_for_image
    return unless image?
    return if image_file.attached? || image_file_blob.present?

    errors.add(:image_file, "must be attached")
  end

  def video_requirements_for_video
    return unless video?
    return if video_url.present? || video_file.attached? || video_file_blob.present?

    errors.add(:base, "Add a video URL or upload a video file")
  end

  def video_file_validation
    return unless video_file.attached?

    unless video_file.content_type.in?(%w[video/mp4 video/quicktime])
      errors.add(:video_file, "must be an MP4 or MOV file")
    end

    max_size = 500.megabytes
    if video_file.byte_size > max_size
      errors.add(:video_file, "is too large (maximum 500 MB)")
    end
  end
end
