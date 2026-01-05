class CategoryLesson < ApplicationRecord
  belongs_to :category
  belongs_to :lesson

  validates :category_id, uniqueness: { scope: :lesson_id }
end
