class CoachProfile < ApplicationRecord
  belongs_to :user

  has_many :lessons, foreign_key: :coach_id, primary_key: :user_id
  has_one_attached :avatar

  validates :display_name, presence: true
  validates :slug, presence: true, uniqueness: true
  validates :user_id, uniqueness: true
  validates :headline, presence: true, length: { maximum: 120 }, allow_blank: false

  validate :avatar_type_and_size

  def to_param
    slug
  end

  private

  def avatar_type_and_size
    return unless avatar.attached?

    if !avatar.content_type.in?(%w[image/png image/jpeg image/jpg image/webp])
      errors.add(:avatar, "must be an image (png, jpg, jpeg, webp)")
    end

    if avatar.byte_size > 5.megabytes
      errors.add(:avatar, "must be smaller than 5MB")
    end
  end
end
