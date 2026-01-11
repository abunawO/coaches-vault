class SubscribersController < ApplicationController
  before_action :require_coach

  def index
    scope = Subscription.active.where(coach_id: current_user.id)
    @subscriber_count = scope.distinct.count(:student_id)
    @subscriptions = scope
                      .select("DISTINCT ON (student_id) subscriptions.*")
                      .order("student_id, created_at DESC")
                      .includes(student: { student_profile: { avatar_attachment: :blob } })
  end

  def bulk_message
    return redirect_to subscribers_path, alert: "Message body is required." if params[:body].to_s.strip.blank?

    recipient_ids = Array(params[:recipient_ids]).map(&:to_i).uniq
    if recipient_ids.empty?
      return redirect_to subscribers_path, alert: "Select at least one subscriber."
    end

    valid_subs = Subscription.active.where(coach_id: current_user.id, student_id: recipient_ids).includes(:student)
    valid_ids = valid_subs.map(&:student_id)

    if valid_ids.sort != recipient_ids.sort
      return redirect_to subscribers_path, alert: "One or more selected subscribers are invalid."
    end

    message_body = params[:body].to_s.strip

    valid_subs.each do |sub|
      conversation = Conversation.find_or_create_by!(student_id: sub.student_id, coach_id: current_user.id)
      conversation.messages.create!(sender: current_user, body: message_body)
    end

    redirect_to subscribers_path, notice: "Message sent to #{valid_subs.size} subscriber(s)."
  rescue StandardError => e
    redirect_to subscribers_path, alert: "Could not send messages: #{e.message}"
  end

  private

  def require_coach
    return if current_user&.coach?

    redirect_to root_path, alert: "You must be a coach to view subscribers."
  end
end
