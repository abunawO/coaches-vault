require "test_helper"

module Coach
  class LessonsControllerTest < ActionDispatch::IntegrationTest
    setup do
      @coach = User.create!(email: "coach@example.com", password: "password", role: "coach")
    end

    test "rerenders create with media signed_id and fields on validation failure" do
      log_in_as(@coach)
      blob = ActiveStorage::Blob.create_and_upload!(
        io: StringIO.new("video data"),
        filename: "test.mp4",
        content_type: "video/mp4"
      )

      post coach_lessons_path, params: {
        lesson: {
          title: "", # trigger validation failure
          description: "Keep this description",
          visibility: "subscribers",
          lesson_media_attributes: {
            "0" => {
              kind: "video",
              position: "0",
              video_file: blob.signed_id
            }
          }
        }
      }

      assert_response :unprocessable_entity
      assert_includes response.body, "Keep this description"
      assert_includes response.body, blob.signed_id
    end

    test "network error rerenders form with params preserved" do
      log_in_as(@coach)
      blob = ActiveStorage::Blob.create_and_upload!(
        io: StringIO.new("video data"),
        filename: "test.mp4",
        content_type: "video/mp4"
      )
      net_error = Seahorse::Client::NetworkingError.new(StandardError.new("boom"), Seahorse::Client::RequestContext.new)

      Lesson.any_instance.stub(:save, -> { raise net_error }) do
        post coach_lessons_path, params: {
          lesson: {
            title: "Network case",
            description: "Should persist",
            visibility: "subscribers",
            lesson_media_attributes: {
              "0" => {
                kind: "video",
                position: "0",
                video_file: blob.signed_id
              }
            }
          }
        }
      end

      assert_response :unprocessable_entity
      assert_includes response.body, "Network case"
      assert_includes response.body, "Should persist"
      assert_includes response.body, blob.signed_id
    end

    private

    def log_in_as(user)
      post login_path, params: { email: user.email, password: "password" }
    end
  end
end
