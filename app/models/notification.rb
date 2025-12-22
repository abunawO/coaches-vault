class Notification < ApplicationRecord
  belongs_to :recipient, class_name: "User"
  belongs_to :actor, class_name: "User", optional: true
  belongs_to :notifiable, polymorphic: true

  validates :message, presence: true

  def target_path
    helpers = Rails.application.routes.url_helpers

    case notifiable
    when Comment
      helpers.lesson_path(notifiable.lesson)
    when Message
      helpers.conversation_path(notifiable.conversation_id)
    else
      helpers.notifications_path
    end
  end
end
