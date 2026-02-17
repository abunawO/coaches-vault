module Coach
  class LessonsController < ApplicationController
    before_action :require_coach
    before_action :set_lesson, only: %i[edit update destroy]
    before_action :load_active_subscribers, only: %i[new create edit update]

    def index
      @lessons = current_user.lessons
    end

    def new
      @lesson = current_user.lessons.build
    end

    def create
      @lesson = current_user.lessons.build(lesson_params.except(:allowed_subscriber_ids, :remove_cover_image))
      ActiveRecord::Base.transaction do
        if @lesson.save
          purge_cover_image_if_requested!(@lesson, lesson_params)
          log_video_upload_expectations(@lesson)
          reconcile_shares!(@lesson, lesson_params[:allowed_subscriber_ids])
          redirect_to coach_lessons_path, notice: "Lesson created successfully." and return
        else
          raise ActiveRecord::Rollback
        end
      end
      rebuild_lesson_media_from_params(@lesson, lesson_params)
      render :new, status: :unprocessable_entity
    rescue Aws::S3::MultipartUploadError, Seahorse::Client::NetworkingError => e
      handle_upload_error(e, :new)
    end

    def edit; end

    def update
      ActiveRecord::Base.transaction do
        if @lesson.update(lesson_params.except(:allowed_subscriber_ids, :remove_cover_image))
          purge_cover_image_if_requested!(@lesson, lesson_params)
          log_video_upload_expectations(@lesson)
          reconcile_shares!(@lesson, lesson_params[:allowed_subscriber_ids])
          redirect_to coach_lessons_path, notice: "Lesson updated successfully."
        else
          raise ActiveRecord::Rollback
        end
      end
      render(:edit, status: :unprocessable_entity) if performed? == false && @lesson.errors.any?
    rescue Aws::S3::MultipartUploadError, Seahorse::Client::NetworkingError => e
      handle_upload_error(e, :edit)
    end

    def destroy
      @lesson.destroy
      redirect_to coach_lessons_path, notice: "Lesson deleted successfully."
    end

    private

    def set_lesson
      @lesson = current_user.lessons.find(params[:id])
    end

    def lesson_params
      params.require(:lesson).permit(
        :title,
        :description,
        :video_url,
        :cover_image,
        :remove_cover_image,
        :visibility,
        :preview,
        :preview_text,
        allowed_subscriber_ids: [],
        lesson_media_attributes: %i[id kind video_url position _destroy image_file video_file]
      )
    end

    def purge_cover_image_if_requested!(lesson, permitted_params)
      return unless permitted_params[:remove_cover_image] == "1"
      return if permitted_params[:cover_image].present?
      return unless lesson.cover_image.attached?

      lesson.cover_image.purge
    end

    def require_coach
      return if logged_in? && current_user.role == "coach"

      redirect_to root_path, alert: "You must be a coach to access that page."
    end

    def load_active_subscribers
      ids = Subscription.active.where(coach_id: current_user.id).pluck(:student_id)
      @subscribers = User.where(id: ids)
                         .includes(student_profile: { avatar_attachment: :blob })
                         .order(:email)
      @preselected_allowed_ids =
        if params.dig(:lesson, :allowed_subscriber_ids).present?
          Array(params[:lesson][:allowed_subscriber_ids]).reject(&:blank?).map(&:to_i)
        elsif @lesson&.persisted?
          @lesson.lesson_shares.pluck(:user_id)
        else
          []
        end
    end

    def log_video_upload_expectations(lesson)
      threshold = multipart_threshold_bytes

      lesson.lesson_media.each do |medium|
        blob = medium.video_file_attachment&.blob
        next unless blob

        size = blob.byte_size
        multipart = size >= threshold
        service = ActiveStorage::Blob.service.name
        ca_bundle_present = ENV["AWS_SSL_CA_BUNDLE"].present?
        Rails.logger.info(
          "[lesson upload] service=#{service} ca_bundle=#{ca_bundle_present} lesson_id=#{lesson.id} video=#{blob.filename} bytes=#{size} multipart_expected=#{multipart} threshold=#{threshold}"
        )
      end
    end

    def multipart_threshold_bytes
      10.megabytes
    end

    def reconcile_shares!(lesson, allowed_ids)
      desired_ids = Array(allowed_ids).reject(&:blank?).map(&:to_i).uniq

      if lesson.visibility == "restricted"
        active_ids = @subscribers.pluck(:id)
        invalid_ids = desired_ids - active_ids
        if desired_ids.empty?
          lesson.errors.add(:base, "Select at least one subscriber for private visibility.")
          raise ActiveRecord::Rollback
        elsif invalid_ids.any?
          lesson.errors.add(:base, "You can only share with active subscribers.")
          raise ActiveRecord::Rollback
        end

        existing_ids = lesson.lesson_shares.pluck(:user_id)
        to_remove = existing_ids - desired_ids
        to_add = desired_ids - existing_ids
        lesson.lesson_shares.where(user_id: to_remove).delete_all if to_remove.any?
        to_add.each { |sid| lesson.lesson_shares.create!(user_id: sid) }
      else
        lesson.lesson_shares.delete_all
      end
    rescue ActiveRecord::RecordInvalid => e
      lesson.errors.add(:base, e.record.errors.full_messages.to_sentence)
      raise ActiveRecord::Rollback
    end

    def handle_upload_error(error, template)
      return if performed?

      Rails.logger.error("[lesson upload] multipart failure lesson_id=#{@lesson&.id} error=#{error.class} message=#{error.message}")
      @lesson ||= current_user.lessons.build
      begin
        @lesson.assign_attributes(lesson_params)
        @preselected_allowed_ids = Array(lesson_params[:allowed_subscriber_ids]).reject(&:blank?).map(&:to_i)
      rescue ActionController::ParameterMissing
        # no params present
      end
      rebuild_lesson_media_from_params(@lesson, lesson_params) rescue nil
      friendly_msg = "We couldn't upload your video. Please retry the upload or choose another file."
      @lesson.errors.add(:base, friendly_msg)
      flash.now[:alert] = friendly_msg
      render template, status: :unprocessable_entity
    end

    def rebuild_lesson_media_from_params(lesson, permitted_params)
      media_attrs = permitted_params[:lesson_media_attributes]
      return unless media_attrs.present?

      media_hash = media_attrs.respond_to?(:to_unsafe_h) ? media_attrs.to_unsafe_h : media_attrs.to_h
      media_hash.each_value do |attrs|
        attrs = attrs.to_h
        media =
          if attrs["id"].present?
            lesson.lesson_media.detect { |m| m.id == attrs["id"].to_i } || lesson.lesson_media.build(id: attrs["id"])
          else
            lesson.lesson_media.build
          end

        cleaned_attrs = attrs.except("id").dup
        %w[image_file video_file].each do |file_key|
          cleaned_attrs.delete(file_key) if cleaned_attrs[file_key].blank?
        end

        media.assign_attributes(cleaned_attrs)
      end
    end
  end
end
