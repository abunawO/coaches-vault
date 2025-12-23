class LessonShare < ApplicationRecord
  belongs_to :lesson
  belongs_to :user

  validates :user_id, uniqueness: { scope: :lesson_id }
end
