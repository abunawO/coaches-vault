module S3
  class MultipartUploadsController < ApplicationController
    protect_from_forgery with: :exception
    wrap_parameters false

    def create
      attrs = create_params
      instrument_upload_perf("create", attrs.slice(:byte_size, :content_type)) do
        upload = multipart_service.create_multipart_upload(**attrs)
        render json: upload, status: :created
      end
    end

    def sign_part
      attrs = sign_params
      instrument_upload_perf("sign_part", attrs.slice(:part_number, :key, :upload_id)) do
        part = multipart_service.presign_part_url(**attrs)
        render json: part
      end
    end

    def complete
      attrs = complete_params
      instrument_upload_perf("complete", attrs.slice(:key, :upload_id).merge(parts_count: Array(attrs[:parts]).size)) do
        key = attrs.fetch(:key)
        upload_id = attrs.fetch(:upload_id)
        parts_count = Array(attrs[:parts]).size

        multipart_service.complete_multipart_upload(**attrs.slice(:upload_id, :key, :parts))
        exists = multipart_service.object_exists?(key: key)

        unless exists
          Rails.logger.error(
            "[multipart_complete_missing_object] " \
            "key=#{key} upload_id=#{upload_id} parts_count=#{parts_count} trace_id=#{upload_trace_id}"
          )
          render json: { error: "Upload completed but object not found in storage. Please retry.", trace_id: upload_trace_id }, status: :unprocessable_entity
          return
        end

        blob = create_blob_from_params!(attrs)
        render json: { ok: true, signed_id: blob.signed_id }
      end
    end

    def abort
      attrs = abort_params
      instrument_upload_perf("abort", attrs) do
        multipart_service.abort_multipart_upload(**attrs)
        head :no_content
      end
    end

    private

    def instrument_upload_perf(action_name, attrs = {})
      started_at = Process.clock_gettime(Process::CLOCK_MONOTONIC)
      result = with_upload_trace_context do
        yield
      end
      if upload_perf_enabled?
        total_ms = ((Process.clock_gettime(Process::CLOCK_MONOTONIC) - started_at) * 1000.0).round
        Rails.logger.info(
          "[upload-perf] controller=#{action_name} ms=#{total_ms} status=#{response.status} trace_id=#{upload_trace_id} " \
          "#{upload_perf_log_fields(attrs)}"
        )
      end
      result
    rescue StandardError => e
      if upload_perf_enabled?
        total_ms = ((Process.clock_gettime(Process::CLOCK_MONOTONIC) - started_at) * 1000.0).round
        Rails.logger.info(
          "[upload-perf] controller=#{action_name} ms=#{total_ms} status=error trace_id=#{upload_trace_id} " \
          "#{upload_perf_log_fields(attrs)} error_class=#{e.class} error_message=#{e.message.inspect}"
        )
      end
      raise
    end

    def upload_perf_enabled?
      request.headers["X-Upload-Trace"].present? || params[:debug_upload_perf].to_s == "1"
    end

    def upload_trace_id
      @upload_trace_id ||= request.headers["X-Upload-Trace"].presence
    end

    def with_upload_trace_context
      previous = Thread.current[:upload_trace_id]
      Thread.current[:upload_trace_id] = upload_trace_id if upload_trace_id.present?
      yield
    ensure
      Thread.current[:upload_trace_id] = previous
    end

    def upload_perf_log_fields(attrs)
      filtered = {
        key: attrs[:key],
        upload_id: attrs[:upload_id],
        part_number: attrs[:part_number],
        parts_count: attrs[:parts_count],
        byte_size: attrs[:byte_size],
        content_type: attrs[:content_type]
      }.compact
      filtered.map { |k, v| "#{k}=#{v}" }.join(" ")
    end

    def multipart_service
      @multipart_service ||= S3MultipartService.new
    end

    def create_params
      attrs = params.permit(:filename, :content_type, :byte_size, :checksum, :key).to_h.symbolize_keys
      attrs[:byte_size] = attrs[:byte_size].to_i if attrs[:byte_size]
      attrs
    end

    def sign_params
      attrs = params.permit(:upload_id, :key, :part_number).to_h.symbolize_keys
      attrs[:part_number] = attrs[:part_number].to_i if attrs[:part_number]
      attrs
    end

    def complete_params
      permitted = params.permit(:upload_id, :key, :filename, :content_type, :byte_size, :checksum, parts: %i[part_number etag])
      permitted.to_h.deep_symbolize_keys.tap do |hash|
        hash[:byte_size] = hash[:byte_size].to_i if hash[:byte_size]
      end
    end

    def abort_params
      params.permit(:upload_id, :key).to_h.symbolize_keys
    end

    def create_blob_from_params!(attrs)
      key = attrs.fetch(:key)
      # Multipart S3 uploads do not currently provide a full-file checksum from the client.
      # Mark blob metadata as composed so ActiveStorage skips checksum validation for attach/save flows.
      blob_attrs = {
        filename: attrs.fetch(:filename),
        content_type: attrs[:content_type],
        byte_size: attrs.fetch(:byte_size).to_i,
        checksum: attrs[:checksum],
        key: key,
        service_name: ActiveStorage::Blob.service.name,
        metadata: { composed: true }
      }
      ActiveStorage::Blob.create!(blob_attrs)
    end
  end
end
