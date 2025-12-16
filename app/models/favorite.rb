class Favorite < ApplicationRecord
  belongs_to :student, class_name: "User"
  belongs_to :lesson

  validates :student, presence: true
  validates :lesson, presence: true
  validate :student_is_student_role

  private

  def student_is_student_role
    return if student&.role == "student"

    errors.add(:student, "must have role student")
  end
end
