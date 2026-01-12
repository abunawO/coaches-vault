class Lesson < ApplicationRecord
  belongs_to :coach, class_name: "User"

  has_many :comments, dependent: :destroy
  has_many :favorites, dependent: :destroy
  has_many :lesson_shares, dependent: :destroy
  has_many :shared_users, through: :lesson_shares, source: :user
  has_many :lesson_media, class_name: "LessonMedium", dependent: :destroy
  has_many :category_lessons, dependent: :destroy
  has_many :categories, through: :category_lessons

  accepts_nested_attributes_for :lesson_media, allow_destroy: true

  validates :title, presence: true
  validate :content_presence

  enum :visibility, { free: 0, subscribers: 1, restricted: 2 }, default: :subscribers

  scope :search, lambda { |q|
    sanitized = sanitize_sql_like(q.to_s)
    where("lessons.title ILIKE :q OR lessons.description ILIKE :q", q: "%#{sanitized}%")
      .order(created_at: :desc)
  }

  validates :preview_text, presence: true, if: -> { preview? && visibility == "subscribers" }
  before_validation :reset_preview_if_not_subscribers

  def viewable_by?(user)
    viewer_access_level(user) == :full
  end

  def previewable_by?(user)
    [:full, :preview].include?(viewer_access_level(user))
  end

  def viewer_access_level(user)
    return :locked unless user
    return :full if coach_id == user.id
    return :full if free?

    subscribed = user.student? && user.subscribed_to?(coach)
    return :locked unless subscribed

    case visibility
    when "subscribers"
      return :full if subscribed
      (preview? && preview_text.present?) ? :preview : :locked
    when "restricted"
      return :full if lesson_shares.exists?(user_id: user.id)
      :locked
    else
      :locked
    end
  end

  def lock_reason_for(user)
    level = viewer_access_level(user)
    return nil if level == :full
    return :preview if level == :preview

    return :not_logged_in unless user
    return :not_subscribed unless user.student? && user.subscribed_to?(coach)
    return :not_shared if restricted?

    :not_subscribed
  end

  private

  def reset_preview_if_not_subscribers
    return if visibility == "subscribers"

    self.preview = false
    self.preview_text = nil
  end

  def content_presence
    media_ok = lesson_media.reject(&:marked_for_destruction?).any? do |m|
      (m.video? && (m.video_url.present? || m.video_file.attached? || m.video_file_blob.present?)) ||
        (m.image? && (m.image_file.attached? || m.image_file_blob.present?))
    end

    return if media_ok
    return if video_url.present?

    errors.add(:base, "Add at least one media item or a video URL")
  end
end
