class Conversation < ApplicationRecord
  belongs_to :student, class_name: "User"
  belongs_to :coach, class_name: "User"
  has_many :messages, dependent: :destroy

  validates :student_id, uniqueness: { scope: :coach_id }
  validate :roles_are_valid

  def other_party(user)
    return coach if user == student
    return student if user == coach

    nil
  end

  def unread_count_for(user)
    messages.unread.where.not(sender_id: user.id).count
  end

  private

  def roles_are_valid
    errors.add(:student, "must be a student") unless student&.student?
    errors.add(:coach, "must be a coach") unless coach&.coach?
  end
end
