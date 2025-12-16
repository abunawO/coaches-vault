class User < ApplicationRecord
  has_secure_password
  has_one :coach_profile, dependent: :destroy
  has_many :lessons, foreign_key: :coach_id, dependent: :destroy
  has_many :favorites, foreign_key: :student_id, dependent: :destroy
  has_many :favorite_lessons, through: :favorites, source: :lesson

  VALID_ROLES = %w[coach student].freeze

  scope :coaches, -> { where(role: "coach") }
  scope :search, lambda { |q|
    sanitized = sanitize_sql_like(q.to_s)
    where("users.email ILIKE :q", q: "%#{sanitized}%")
  }

  validates :email, presence: true, uniqueness: true
  validates :role, presence: true, inclusion: { in: VALID_ROLES }

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
end
