class ConversationsController < ApplicationController
  before_action :set_conversation, only: :show

  def index
    @conversations = current_user.student? ? Conversation.where(student_id: current_user.id) : Conversation.where(coach_id: current_user.id)
    @conversations = @conversations.includes(:student, :coach, :messages).order(updated_at: :desc)
  end

  def create
    if current_user.student?
      coach = User.coaches.find(params[:coach_id])
      unless current_user.subscribed_to?(coach)
        return redirect_to coach_path(coach.coach_profile&.slug || coaches_path), alert: "Subscribe to message this coach."
      end
      conversation = Conversation.find_or_create_by!(student: current_user, coach: coach)
    else
      student = User.find_by!(id: params[:student_id], role: "student")
      conversation = Conversation.find_by(student: student, coach: current_user)
      return redirect_to conversations_path, alert: "You can only reply to existing conversations." unless conversation
    end

    redirect_to conversation_path(conversation)
  rescue ActiveRecord::RecordNotFound
    redirect_to conversations_path, alert: "Unable to start conversation."
  end

  def show
    authorize_conversation!(@conversation)
    @messages = @conversation.messages.includes(:sender).order(:created_at)
    @conversation.messages.unread.where.not(sender_id: current_user.id).update_all(read_at: Time.current)
    @message = @conversation.messages.build
    @allow_messaging = current_user.coach? || (current_user.student? && current_user.subscribed_to?(@conversation.coach))
  end

  private

  def set_conversation
    @conversation = Conversation.find(params[:id])
  end

  def authorize_conversation!(conversation)
    return if conversation.student_id == current_user.id || conversation.coach_id == current_user.id

    redirect_to conversations_path, alert: "Not authorized to view this conversation."
  end
end
