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
      @lesson = current_user.lessons.build(lesson_params.except(:allowed_subscriber_ids))
      ActiveRecord::Base.transaction do
        if @lesson.save
          log_video_upload_expectations(@lesson)
          reconcile_shares!(@lesson, lesson_params[:allowed_subscriber_ids])
          redirect_to coach_lessons_path, notice: "Lesson created successfully." and return
        else
          raise ActiveRecord::Rollback
        end
      end
      render :new, status: :unprocessable_entity
    rescue Aws::S3::MultipartUploadError, Seahorse::Client::NetworkingError => e
      handle_upload_error(e, :new)
    end

    def edit; end

    def update
      ActiveRecord::Base.transaction do
        if @lesson.update(lesson_params.except(:allowed_subscriber_ids))
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
        :visibility,
        :preview,
        :preview_text,
        allowed_subscriber_ids: [],
        lesson_media_attributes: %i[id kind video_url position _destroy image_file video_file]
      )
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
      friendly_msg = "We couldn't upload your video. Please retry the upload or choose another file."
      @lesson.errors.add(:base, friendly_msg)
      flash.now[:alert] = friendly_msg
      render template, status: :unprocessable_entity
    end
  end
end
