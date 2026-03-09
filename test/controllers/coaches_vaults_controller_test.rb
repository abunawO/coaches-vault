require "test_helper"

class CoachesVaultsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @owner_coach = User.create!(email: "owner_coach@example.com", password: "password", role: "coach")
    @other_coach = User.create!(email: "other_coach@example.com", password: "password", role: "coach")
    @student = User.create!(email: "student_preview@example.com", password: "password", role: "student")

    @owner_profile = CoachProfile.create!(
      user: @owner_coach,
      display_name: "Owner Coach",
      headline: "Owner headline",
      slug: "owner-coach"
    )
  end

  test "owning coach sees preview banner and back link in preview mode" do
    log_in_as(@owner_coach)

    get coach_public_vault_path(@owner_profile.slug, preview: 1, return_to: coach_vault_path)

    assert_response :success
    assert_includes response.body, "Student View Preview"
    assert_includes response.body, "Back to Coach View"
    assert_includes response.body, "href=\"#{coach_vault_path}\""
  end

  test "non-owning coach does not see preview banner even with preview param" do
    log_in_as(@other_coach)

    get coach_public_vault_path(@owner_profile.slug, preview: 1, return_to: coach_vault_path)

    assert_response :success
    assert_not_includes response.body, "Student View Preview"
    assert_not_includes response.body, "Back to Coach View"
  end

  test "student does not see preview banner even with preview param" do
    log_in_as(@student)

    get coach_public_vault_path(@owner_profile.slug, preview: 1, return_to: coach_vault_path)

    assert_response :success
    assert_not_includes response.body, "Student View Preview"
    assert_not_includes response.body, "Back to Coach View"
  end

  test "unsafe return_to falls back to coach vault path" do
    log_in_as(@owner_coach)

    get coach_public_vault_path(@owner_profile.slug, preview: 1, return_to: "https://evil.test/steal")

    assert_response :success
    assert_includes response.body, "Student View Preview"
    assert_includes response.body, "href=\"#{coach_vault_path}\""
  end

  private

  def log_in_as(user)
    post login_path, params: { email: user.email, password: "password" }
  end
end
