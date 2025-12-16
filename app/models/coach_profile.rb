class CoachProfile < ApplicationRecord
  belongs_to :user

  has_many :lessons, foreign_key: :coach_id, primary_key: :user_id

  validates :display_name, presence: true
  validates :slug, presence: true, uniqueness: true
  validates :user_id, uniqueness: true

  def to_param
    slug
  end
end
