class S3MultipartService
  DEFAULT_EXPIRY = 15.minutes

  def initialize(client: nil, bucket: nil, region: nil)
    @client = client || Aws::S3::Client.new
    @bucket = bucket || default_bucket
    @region = region || default_region
  end

  def create_multipart_upload(filename:, content_type:, byte_size:, checksum: nil, key: nil)
    key ||= ActiveStorage::Blob.generate_unique_secure_token
    response = measure_aws_upload_perf("create_multipart_upload", key: key) do
      client.create_multipart_upload(
        bucket: bucket,
        key: key,
        content_type: content_type,
        metadata: metadata_for(filename: filename, checksum: checksum, byte_size: byte_size)
      )
    end

    {
      upload_id: response.upload_id,
      key: key,
      bucket: bucket,
      region: region
    }
  end

  def presign_part_url(upload_id:, key:, part_number:)
    signer = Aws::S3::Presigner.new(client: client)
    url = measure_aws_upload_perf("presign_part_url", key: key, upload_id: upload_id, part_number: part_number) do
      signer.presigned_url(
        :upload_part,
        bucket: bucket,
        key: key,
        upload_id: upload_id,
        part_number: part_number,
        expires_in: DEFAULT_EXPIRY
      )
    end

    { url: url }
  end

  def complete_multipart_upload(upload_id:, key:, parts: [])
    sorted_parts = parts.sort_by { |p| p[:part_number].to_i }
    measure_aws_upload_perf("complete_multipart_upload", key: key, upload_id: upload_id) do
      client.complete_multipart_upload(
        bucket: bucket,
        key: key,
        upload_id: upload_id,
        multipart_upload: { parts: map_parts(sorted_parts) }
      )
    end
    { ok: true }
  end

  def abort_multipart_upload(upload_id:, key:)
    measure_aws_upload_perf("abort_multipart_upload", key: key, upload_id: upload_id) do
      client.abort_multipart_upload(bucket: bucket, key: key, upload_id: upload_id)
    end
    { ok: true }
  end

  def object_exists?(key:)
    measure_aws_upload_perf("head_object", key: key) do
      client.head_object(bucket: bucket, key: key)
    end
    true
  rescue Aws::S3::Errors::NotFound
    false
  rescue StandardError => e
    Rails.logger.error("[s3_object_exists_error] key=#{key} err=#{e.class}: #{e.message}")
    false
  end

  private

  attr_reader :client, :bucket, :region

  def default_bucket
    service = ActiveStorage::Blob.service
    return service.bucket.name if service.respond_to?(:bucket)

    ENV["AWS_S3_BUCKET"] || ENV["AWS_BUCKET_NAME"] || raise("Missing S3 bucket")
  end

  def default_region
    service = ActiveStorage::Blob.service
    return service.client.config.region if service.respond_to?(:client)

    ENV["AWS_REGION"] || raise("Missing AWS region")
  end

  def map_parts(parts)
    parts.map do |part|
      {
        etag: part[:etag] || part["etag"],
        part_number: part[:part_number] || part["part_number"] || part["PartNumber"]
      }
    end
  end

  def metadata_for(filename:, checksum:, byte_size:)
    meta = { filename: filename, byte_size: byte_size }
    meta[:checksum] = checksum if checksum.present?
    meta
  end

  def measure_aws_upload_perf(op, key: nil, upload_id: nil, part_number: nil)
    trace_id = Thread.current[:upload_trace_id]
    return yield unless trace_id.present?

    started_at = Process.clock_gettime(Process::CLOCK_MONOTONIC)
    result = yield
    ms = ((Process.clock_gettime(Process::CLOCK_MONOTONIC) - started_at) * 1000.0).round
    Rails.logger.info(
      "[upload-perf] aws=#{op} ms=#{ms} key=#{key} upload_id=#{upload_id} part_number=#{part_number} trace_id=#{trace_id}"
    )
    result
  rescue StandardError => e
    ms = ((Process.clock_gettime(Process::CLOCK_MONOTONIC) - started_at) * 1000.0).round
    Rails.logger.info(
      "[upload-perf] aws=#{op} ms=#{ms} key=#{key} upload_id=#{upload_id} part_number=#{part_number} " \
      "trace_id=#{trace_id} status=error error_class=#{e.class} error_message=#{e.message.inspect}"
    )
    raise
  end
end
