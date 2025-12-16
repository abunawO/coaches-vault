require "test_helper"

class SubscriptionsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @coach = User.create!(email: "coach@example.com", password: "password", role: "coach")
    @coach_two = User.create!(email: "coach2@example.com", password: "password", role: "coach")
    @student = User.create!(email: "student@example.com", password: "password", role: "student")
  end

  test "student can subscribe" do
    log_in_as(@student)
    assert_difference -> { Subscription.active.count }, 1 do
      post coach_subscription_path(@coach)
    end
    assert_redirected_to coaches_path
  end

  test "student can subscribe to multiple coaches" do
    log_in_as(@student)
    post coach_subscription_path(@coach)
    post coach_subscription_path(@coach_two)
    active = Subscription.active.where(student: @student)
    assert_equal 2, active.count
  end

  test "student cannot create duplicate active subscription to same coach" do
    log_in_as(@student)
    post coach_subscription_path(@coach)
    assert_no_difference -> { Subscription.count } do
      post coach_subscription_path(@coach)
    end
  end

  test "cancel only affects that coach subscription" do
    log_in_as(@student)
    post coach_subscription_path(@coach)
    post coach_subscription_path(@coach_two)

    delete cancel_coach_subscription_path(@coach)

    assert_equal 1, Subscription.active.where(student: @student).count
    assert Subscription.active.exists?(student: @student, coach: @coach_two)
  end

  test "student can cancel subscription" do
    log_in_as(@student)
    Subscription.create!(student: @student, coach: @coach, status: "active", started_at: Time.current)

    delete cancel_coach_subscription_path(@coach)
    assert_redirected_to coaches_path
    assert_equal "canceled", Subscription.last.status
  end

  test "coach cannot subscribe" do
    log_in_as(@coach)
    assert_no_difference -> { Subscription.count } do
      post coach_subscription_path(@coach)
    end
    assert_redirected_to root_path
  end

  test "guest cannot subscribe" do
    post coach_subscription_path(@coach)
    assert_redirected_to login_path
  end

  private

  def log_in_as(user)
    post login_path, params: { email: user.email, password: "password" }
  end
end
