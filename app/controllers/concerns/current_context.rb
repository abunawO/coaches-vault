module CurrentContext
  extend ActiveSupport::Concern

  included do
    around_action :with_current_context
  end

  private

  def with_current_context
    skip_logging = request.path == "/up"
    start = Process.clock_gettime(Process::CLOCK_MONOTONIC)

    unless skip_logging
      Current.request_id = request.request_id
      Current.remote_ip  = request.remote_ip
      if respond_to?(:current_user, true)
        Current.user = current_user
        Current.user_id = current_user&.id
        Current.user_email = current_user&.email
      end
    end

    yield
  ensure
    unless skip_logging
      duration_ms = ((Process.clock_gettime(Process::CLOCK_MONOTONIC) - start) * 1000).round(1)
      db_ms = (respond_to?(:db_runtime, true) && db_runtime ? db_runtime.round(1) : 0.0)
      view_ms = (respond_to?(:view_runtime, true) && view_runtime ? view_runtime.round(1) : 0.0)
      Rails.logger.info(
        "Request completed status=#{response.status} method=#{request.method} path=#{request.fullpath} duration_ms=#{duration_ms} db_ms=#{db_ms} view_ms=#{view_ms}"
      )
    end
    Current.reset
  end
end
