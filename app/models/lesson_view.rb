class LessonView < ApplicationRecord
  belongs_to :user
  belongs_to :lesson

  validates :user, :lesson, presence: true
  validates :view_count, numericality: { greater_than_or_equal_to: 0 }
  validates :lesson_id, uniqueness: { scope: :user_id }
  validate :user_is_student

  private

  def user_is_student
    return if user&.student?

    errors.add(:user, "must have role student")
  end
end
