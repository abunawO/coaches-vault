class Category < ApplicationRecord
  CATEGORY_TYPES = [
    "MMA Systems",
    "Grappling",
    "Striking",
    "Wrestling",
    "Fight IQ",
    "Conditioning"
  ].freeze

  belongs_to :coach, class_name: "User"
  has_many :category_lessons, dependent: :destroy
  has_many :lessons, through: :category_lessons

  validates :name, presence: true
  validates :category_type, presence: true, length: { maximum: 60 }
  validate :category_type_not_reserved

  before_validation :normalize_category_type

  scope :ordered, -> { order(position: :asc, created_at: :asc) }

  def built_in_category_type?
    CATEGORY_TYPES.include?(category_type)
  end

  private

  def normalize_category_type
    self.category_type = category_type.to_s.strip
  end

  def category_type_not_reserved
    return unless category_type == "__custom__"

    errors.add(:category_type, "must be a valid category type")
  end
end
