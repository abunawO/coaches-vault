class StudentProfile < ApplicationRecord
  belongs_to :user
  has_one_attached :avatar

  validates :display_name, presence: true

  validate :avatar_type_and_size

  private

  def avatar_type_and_size
    return unless avatar.attached?

    unless avatar.content_type.in?(%w[image/png image/jpeg image/jpg image/webp])
      errors.add(:avatar, "must be an image (png, jpg, jpeg, webp)")
    end

    if avatar.byte_size > 5.megabytes
      errors.add(:avatar, "must be smaller than 5MB")
    end
  end
end
