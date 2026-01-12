require "test_helper"

class CoachesGuestAccessTest < ActionDispatch::IntegrationTest
  test "guest can view coaches page with no coach profiles" do
    CoachProfile.delete_all

    get coaches_path

    assert_response :success
    assert_includes @response.body, "No coaches found"
  end
end
