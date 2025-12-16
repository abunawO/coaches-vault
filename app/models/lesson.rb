class Lesson < ApplicationRecord
  belongs_to :coach, class_name: "User"

  validates :title, presence: true
  validates :video_url, presence: true

  scope :search, lambda { |q|
    sanitized = sanitize_sql_like(q.to_s)
    where("lessons.title ILIKE :q OR lessons.description ILIKE :q", q: "%#{sanitized}%")
      .order(created_at: :desc)
  }
end
