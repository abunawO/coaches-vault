require "test_helper"

module Coach
  class InsightsControllerTest < ActionDispatch::IntegrationTest
    setup do
      @coach = User.create!(email: "insights_coach@example.com", password: "password", role: "coach")
      @student = User.create!(email: "insights_student@example.com", password: "password", role: "student")
    end

    test "guest is redirected to login" do
      get coach_insights_path
      assert_redirected_to login_path
    end

    test "student is redirected to root" do
      log_in_as(@student)
      get coach_insights_path
      assert_redirected_to root_path
    end

    test "coach can view insights page" do
      log_in_as(@coach)
      get coach_insights_path
      assert_response :success
      assert_includes response.body, "Insights"
      assert_includes response.body, "Recent Student Activity"
    end

    private

    def log_in_as(user)
      post login_path, params: { email: user.email, password: "password" }
    end
  end
end
