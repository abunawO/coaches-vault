class Category < ApplicationRecord
  belongs_to :coach, class_name: "User"
  has_many :category_lessons, dependent: :destroy
  has_many :lessons, through: :category_lessons

  validates :name, presence: true

  scope :ordered, -> { order(position: :asc, created_at: :asc) }
end
