require "test_helper"

class MessageTest < ActiveSupport::TestCase
  def setup
    @coach = User.create!(email: "coach@test.com", password: "password", role: "coach")
    @student = User.create!(email: "student@test.com", password: "password", role: "student")
    @conversation = Conversation.create!(coach: @coach, student: @student)
  end

  test "restores conversation for sender when previously deleted by sender" do
    @conversation.update!(deleted_by_student_at: Time.current)
    assert @conversation.deleted_for?(@student)

    Message.create!(conversation: @conversation, sender: @student, body: "hello")

    @conversation.reload
    refute @conversation.deleted_for?(@student), "conversation should be restored for sender after sending a message"
  end

  test "restores conversation for recipient when previously deleted by recipient" do
    @conversation.update!(deleted_by_coach_at: Time.current)
    assert @conversation.deleted_for?(@coach)

    Message.create!(conversation: @conversation, sender: @student, body: "hello")

    @conversation.reload
    refute @conversation.deleted_for?(@coach), "conversation should be restored for recipient after receiving a message"
  end
end
