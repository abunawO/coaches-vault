class Subscription < ApplicationRecord
  belongs_to :student, class_name: "User"
  belongs_to :coach, class_name: "User"

  STATUSES = %w[active canceled].freeze

  scope :active, -> { where(status: "active") }
  scope :canceled, -> { where(status: "canceled") }
  scope :active_for_student, ->(student) { active.where(student_id: student&.id) }

  validates :status, presence: true, inclusion: { in: STATUSES }
  validate :student_is_student_role
  validate :coach_is_coach_role

  private

  def student_is_student_role
    return if student&.role == "student"

    errors.add(:student, "must have role student")
  end

  def coach_is_coach_role
    return if coach&.role == "coach"

    errors.add(:coach, "must have role coach")
  end
end
