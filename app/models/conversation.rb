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

  def deleted_for?(user)
    if user.student?
      deleted_by_student_at.present?
    elsif user.coach?
      deleted_by_coach_at.present?
    else
      false
    end
  end

  def mark_deleted_for!(user)
    if user.student?
      update!(deleted_by_student_at: Time.current)
    elsif user.coach?
      update!(deleted_by_coach_at: Time.current)
    end
  end

  def restore_for!(user)
    if user.student? && deleted_by_student_at.present?
      update_column(:deleted_by_student_at, nil)
    elsif user.coach? && deleted_by_coach_at.present?
      update_column(:deleted_by_coach_at, nil)
    end
  end

  def both_deleted?
    deleted_by_student_at.present? && deleted_by_coach_at.present?
  end

  private

  def roles_are_valid
    errors.add(:student, "must be a student") unless student&.student?
    errors.add(:coach, "must be a coach") unless coach&.coach?
  end
end
