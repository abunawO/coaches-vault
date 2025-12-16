require "test_helper"

class SearchControllerTest < ActionDispatch::IntegrationTest
  setup do
    @coach = User.create!(email: "coach@example.com", password: "password", role: "coach")
    @coach_profile = CoachProfile.create!(user: @coach, display_name: "Coach Alpha", slug: "coach-alpha", bio: "Angles and frames")
    @lesson = Lesson.create!(coach: @coach, title: "Guard Passing Basics", description: "Learn angles", video_url: "https://example.com/video")

    @student = User.create!(email: "student@example.com", password: "password", role: "student")
    Subscription.create!(student: @student, coach: @coach, status: "active", started_at: Time.current)
  end

  test "blank query shows empty state" do
    get search_path
    assert_response :success
    assert_match "Try a search", @response.body
  end

  test "query returns matching lessons" do
    get search_path(q: "Guard")
    assert_response :success
    assert_match @lesson.title, @response.body
  end

  test "query returns matching coaches" do
    get search_path(q: "Alpha", type: "coaches")
    assert_response :success
    assert_match @coach_profile.display_name, @response.body
  end

  test "locked lessons do not leak video url" do
    other_student = User.create!(email: "student2@example.com", password: "password", role: "student")
    post login_path, params: { email: other_student.email, password: "password" }
    get search_path(q: "Guard")
    refute_includes @response.body, @lesson.video_url
  end
end
