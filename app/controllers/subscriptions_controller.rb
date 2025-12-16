class SubscriptionsController < ApplicationController
  before_action :require_student
  before_action :set_coach, only: %i[create destroy]

  def create
    return redirect_back fallback_location: coaches_path, alert: "You can only subscribe to coaches." unless @coach.coach?

    existing_active = Subscription.active.find_by(student_id: current_user.id, coach_id: @coach.id)
    return redirect_back fallback_location: coaches_path, notice: "Already subscribed." if existing_active

    existing_canceled = Subscription.where(student_id: current_user.id, coach_id: @coach.id, status: "canceled").first

    if existing_canceled
      existing_canceled.update!(status: "active", started_at: Time.current, ended_at: nil)
    else
      Subscription.create!(
        student: current_user,
        coach: @coach,
        status: "active",
        started_at: Time.current,
        ended_at: nil
      )
    end

    redirect_back fallback_location: coaches_path, notice: "Subscription created."
  rescue ActiveRecord::RecordNotFound
    redirect_back fallback_location: coaches_path, alert: "Coach not found."
  end

  def destroy
    subscription = Subscription.active.find_by(student_id: current_user.id, coach_id: @coach.id)

    unless subscription
      redirect_back fallback_location: subscriptions_path, alert: "No active subscription to cancel." and return
    end

    subscription.update!(status: "canceled", ended_at: Time.current)
    redirect_back fallback_location: subscriptions_path, notice: "Subscription canceled."
  end

  def index
    @active_subscriptions = Subscription.active.where(student_id: current_user.id).includes(coach: :coach_profile).order(started_at: :desc)

    canceled = Subscription.canceled.where(student_id: current_user.id).includes(coach: :coach_profile).order(ended_at: :desc, updated_at: :desc)
    grouped = canceled.group_by(&:coach_id)
    @past_subscriptions = grouped.values.map(&:first)
  end

  private

  def set_coach
    @coach = User.find(params[:coach_id])
  end

  def active_subscription_for_current_student
    current_user.active_subscription
  end
end
