require "test_helper"

class LessonsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @coach = User.create!(email: "coach@example.com", password: "password", role: "coach")
    @student = User.create!(email: "student@example.com", password: "password", role: "student")
    @other_student = User.create!(email: "student2@example.com", password: "password", role: "student")
    @lesson = Lesson.create!(coach: @coach, title: "Test Lesson", video_url: "https://example.com/video")
    Subscription.create!(student: @student, coach: @coach, status: "active", started_at: Time.current)
  end

  test "guest is redirected to login for show" do
    get lesson_path(@lesson)
    assert_redirected_to login_path
  end

  test "non-subscribed student is redirected for show" do
    log_in_as(@other_student)
    get lesson_path(@lesson)
    assert_redirected_to lessons_path
  end

  test "subscribed student can view show" do
    log_in_as(@student)
    get lesson_path(@lesson)
    assert_response :success
  end

  test "coach can view own lesson" do
    log_in_as(@coach)
    get lesson_path(@lesson)
    assert_response :success
  end

  private

  def log_in_as(user)
    post login_path, params: { email: user.email, password: "password" }
  end
end
