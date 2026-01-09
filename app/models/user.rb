class User < ApplicationRecord
  has_secure_password
  has_one :coach_profile, dependent: :destroy
  has_one :student_profile, dependent: :destroy
  has_many :lessons, foreign_key: :coach_id, dependent: :destroy
  has_many :favorites, foreign_key: :student_id, dependent: :destroy
  has_many :favorite_lessons, through: :favorites, source: :lesson
  has_many :comments, dependent: :destroy
  has_many :notifications, foreign_key: :recipient_id, dependent: :destroy
  has_many :student_conversations, class_name: "Conversation", foreign_key: :student_id, dependent: :destroy, inverse_of: :student
  has_many :coach_conversations, class_name: "Conversation", foreign_key: :coach_id, dependent: :destroy, inverse_of: :coach
  has_many :sent_messages, class_name: "Message", foreign_key: :sender_id, dependent: :destroy

  has_many :lesson_shares, dependent: :destroy
  has_many :shared_lessons, through: :lesson_shares, source: :lesson
  has_many :categories, foreign_key: :coach_id, dependent: :destroy

  VALID_ROLES = %w[coach student].freeze

  scope :coaches, -> { where(role: "coach") }
  scope :search, lambda { |q|
    sanitized = sanitize_sql_like(q.to_s)
    where("users.email ILIKE :q", q: "%#{sanitized}%")
  }

  validates :email, presence: true, uniqueness: true
  validates :role, presence: true, inclusion: { in: VALID_ROLES }

  def email_verified?
    email_verified_at.present?
  end

  def coach?
    role == "coach"
  end

  def student?
    role == "student"
  end

  def active_subscription(coach: nil)
    return unless student?

    scope = Subscription.active.where(student_id: id)
    scope = scope.where(coach_id: coach.id) if coach
    scope.first
  end

  def subscribed_to?(coach_user)
    return false unless coach_user

    Subscription.active.exists?(student_id: id, coach_id: coach_user.id)
  end

  def favorited?(lesson)
    return false unless student?

    favorite_lessons.exists?(lesson.id)
  end

  def unread_notifications
    notifications.where(read_at: nil)
  end

  def unread_notifications_count
    unread_notifications.count
  end

  def unread_messages_count
    Message
      .joins(:conversation)
      .where(read_at: nil)
      .where.not(sender_id: id)
      .where("conversations.student_id = :id OR conversations.coach_id = :id", id: id)
      .count
  end

  def all_conversations
    Conversation.where("student_id = :id OR coach_id = :id", id: id)
  end
end
