require "test_helper"

class FavoritesControllerTest < ActionDispatch::IntegrationTest
  setup do
    @coach = User.create!(email: "coach@example.com", password: "password", role: "coach")
    @student = User.create!(email: "student@example.com", password: "password", role: "student")
    @lesson = Lesson.create!(coach: @coach, title: "Fav Lesson", video_url: "https://example.com/video")
  end

  test "guest cannot favorite" do
    post favorite_lesson_path(@lesson)
    assert_redirected_to login_path
  end

  test "coach cannot favorite" do
    log_in_as(@coach)
    post favorite_lesson_path(@lesson)
    assert_redirected_to root_path
  end

  test "student can favorite" do
    log_in_as(@student)
    assert_difference -> { Favorite.count }, 1 do
      post favorite_lesson_path(@lesson)
    end
    assert_redirected_to favorites_path
  end

  test "student can unfavorite" do
    log_in_as(@student)
    @student.favorites.create!(lesson: @lesson)
    assert_difference -> { Favorite.count }, -1 do
      delete unfavorite_lesson_path(@lesson)
    end
    assert_redirected_to favorites_path
  end

  test "favorites index shows favorited lessons" do
    log_in_as(@student)
    @student.favorites.create!(lesson: @lesson)
    get favorites_path
    assert_response :success
    assert_match @lesson.title, @response.body
  end

  test "favoriting twice does not duplicate" do
    log_in_as(@student)
    post favorite_lesson_path(@lesson)
    assert_no_difference -> { Favorite.count } do
      post favorite_lesson_path(@lesson)
    end
  end

  private

  def log_in_as(user)
    post login_path, params: { email: user.email, password: "password" }
  end
end
