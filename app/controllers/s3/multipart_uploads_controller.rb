module S3
  class MultipartUploadsController < ApplicationController
    protect_from_forgery with: :exception

    def create
      upload = multipart_service.create_multipart_upload(**create_params)
      render json: upload, status: :created
    end

    def sign_part
      part = multipart_service.presign_part_url(**sign_params)
      render json: part
    end

    def complete
      multipart_service.complete_multipart_upload(**complete_params.slice(:upload_id, :key, :parts))
      blob = create_blob_from_params!(complete_params)
      render json: { ok: true, signed_id: blob.signed_id }
    end

    def abort
      multipart_service.abort_multipart_upload(**abort_params)
      head :no_content
    end

    private

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
      ActiveStorage::Blob.create!(
        filename: attrs.fetch(:filename),
        content_type: attrs[:content_type],
        byte_size: attrs.fetch(:byte_size).to_i,
        checksum: attrs[:checksum],
        key: key,
        service_name: ActiveStorage::Blob.service.name,
        metadata: {}
      )
    end
  end
end
