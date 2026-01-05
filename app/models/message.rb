class Message < ApplicationRecord
  belongs_to :conversation, touch: true
  belongs_to :sender, class_name: "User"

  validates :body, presence: true
  validate :sender_is_participant
  after_create_commit :notify_recipient
  after_create_commit :restore_deleted_flags

  scope :unread, -> { where(read_at: nil) }

  private

  def sender_is_participant
    return if conversation.blank? || sender.blank?
    return if sender_id == conversation.student_id || sender_id == conversation.coach_id

    errors.add(:sender, "must belong to the conversation")
  end

  def notify_recipient
    recipient =
      if sender_id == conversation.student_id
        conversation.coach
      else
        conversation.student
      end

    return if recipient.nil? || recipient.id == sender_id

    Notification.create!(
      recipient: recipient,
      actor: sender,
      notifiable: self,
      message: "New message from #{sender.email}"
    )
  end

  def restore_deleted_flags
    recipient =
      if sender_id == conversation.student_id
        conversation.coach
      else
        conversation.student
      end

    conversation.restore_for!(sender) if sender
    conversation.restore_for!(recipient) if recipient
  end
end
