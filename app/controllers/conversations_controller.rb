class ConversationsController < ApplicationController
  before_action :set_conversation, only: [:show, :destroy]
  before_action :authorize_conversation!, only: [:show, :destroy]

  def index
    @tab = params[:tab].presence_in(%w[all unread]) || "all"
    @q = params[:q].to_s.strip
    base =
      if current_user.student?
        Conversation.where(student_id: current_user.id, deleted_by_student_at: nil)
      else
        Conversation.where(coach_id: current_user.id, deleted_by_coach_at: nil)
      end
    @conversations = base
                      .includes(:student, :coach, :messages)
                      .order(updated_at: :desc)

    if @tab == "unread"
      @conversations = @conversations
                         .joins(:messages)
                         .where(messages: { read_at: nil })
                         .where.not(messages: { sender_id: current_user.id })
                         .distinct
    end

    if @q.present?
      qlike = "%#{ActiveRecord::Base.sanitize_sql_like(@q)}%"
      @conversations = @conversations
                         .left_joins(:messages)
                         .left_joins(:student)
                         .where("users.email ILIKE :q OR messages.body ILIKE :q", q: qlike)
                         .distinct
    end
  end

  def mark_all_read
    Message
      .joins(:conversation)
      .where(read_at: nil)
      .where.not(sender_id: current_user.id)
      .where("conversations.student_id = :id OR conversations.coach_id = :id", id: current_user.id)
      .update_all(read_at: Time.current)

    redirect_to conversations_path(tab: params[:tab], q: params[:q]), notice: "All messages marked as read."
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

  def destroy
    @conversation.mark_deleted_for!(current_user)
    @conversation.destroy! if @conversation.both_deleted?
    respond_to do |format|
      format.turbo_stream
      format.html { redirect_to conversations_path, notice: "Conversation deleted." }
    end
  end

  private

  def set_conversation
    @conversation = Conversation.find(params[:id])
  end

  def authorize_conversation!(conversation = @conversation)
    return if conversation.present? && (conversation.student_id == current_user.id || conversation.coach_id == current_user.id)

    redirect_to conversations_path, alert: "Not authorized to view this conversation."
  end
end
