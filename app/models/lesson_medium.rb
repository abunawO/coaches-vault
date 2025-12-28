class LessonMedium < ApplicationRecord
  belongs_to :lesson
  has_one_attached :image_file

  enum :kind, { image: 0, video: 1 }

  validates :kind, presence: true
  validates :video_url, presence: true, if: -> { video? }
  validate :image_attached_for_image

  default_scope { order(:position, :created_at) }

  private

  def image_attached_for_image
    return unless image?
    errors.add(:image_file, "must be attached") unless image_file.attached?
  end
end
