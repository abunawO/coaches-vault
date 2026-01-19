require "test_helper"

class S3::MultipartUploadsControllerTest < ActionDispatch::IntegrationTest
  def setup
    @service = Minitest::Mock.new
  end

  test "create multipart upload" do
    @service.expect :create_multipart_upload, { upload_id: "u1", key: "k1", bucket: "b1", region: "r1" }, [Hash]

    S3MultipartService.stub :new, @service do
      post "/s3/multipart/create", params: { filename: "video.mp4", content_type: "video/mp4", byte_size: 123 }
    end

    assert_response :created
    body = JSON.parse(response.body)
    assert_equal "u1", body["upload_id"]
    assert_equal "k1", body["key"]
    @service.verify
  end

  test "sign part" do
    @service.expect :presign_part_url, { url: "https://example.com" }, [Hash]

    S3MultipartService.stub :new, @service do
      post "/s3/multipart/sign_part", params: { upload_id: "u1", key: "k1", part_number: 1 }
    end

    assert_response :success
    body = JSON.parse(response.body)
    assert_equal "https://example.com", body["url"]
    @service.verify
  end

  test "complete multipart upload returns signed id" do
    @service.expect :complete_multipart_upload, { ok: true }, [Hash]

    S3MultipartService.stub :new, @service do
      post "/s3/multipart/complete", params: {
        upload_id: "u1",
        key: "k1",
        filename: "video.mp4",
        content_type: "video/mp4",
        byte_size: 123,
        parts: [{ part_number: 1, etag: "etag-1" }]
      }
    end

    assert_response :success
    body = JSON.parse(response.body)
    assert body["signed_id"].present?
    @service.verify
  end

  test "abort multipart upload" do
    @service.expect :abort_multipart_upload, { ok: true }, [Hash]

    S3MultipartService.stub :new, @service do
      post "/s3/multipart/abort", params: { upload_id: "u1", key: "k1" }
    end

    assert_response :no_content
    @service.verify
  end
end
