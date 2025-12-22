class MessagesController < ApplicationController
  before_action :set_conversation
  before_action :authorize_conversation!

  def create
    @message = @conversation.messages.build(message_params.merge(sender: current_user))

    if current_user.student? && !current_user.subscribed_to?(@conversation.coach)
      return redirect_to conversation_path(@conversation), alert: "Subscribe to message this coach."
    end

    if @message.save
      redirect_to conversation_path(@conversation, anchor: "bottom")
    else
      @messages = @conversation.messages.includes(:sender).order(:created_at)
      flash.now[:alert] = "Message could not be sent."
      render "conversations/show", status: :unprocessable_entity
    end
  end

  private

  def set_conversation
    @conversation = Conversation.find(params[:conversation_id])
  end

  def authorize_conversation!
    return if @conversation.student_id == current_user.id || @conversation.coach_id == current_user.id

    redirect_to conversations_path, alert: "Not authorized to view this conversation."
  end

  def message_params
    params.require(:message).permit(:body)
  end
end
