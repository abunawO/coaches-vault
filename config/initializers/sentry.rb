# frozen_string_literal: true

# Minimal Sentry setup; only sends when DSN present and environment allowed.
if ENV["SENTRY_DSN"].present? && (Rails.env.production? || ENV["SENTRY_ENV_ALLOWED"] == "1")
  Sentry.init do |config|
    config.dsn = ENV["SENTRY_DSN"]
    config.environment = Rails.env
    config.release = ENV["KAMAL_VERSION"].presence || ENV["GIT_SHA"].presence

    # Keep performance tracing off for now.
    config.traces_sample_rate = 0.0

    # Privacy: do not send PII by default.
    config.send_default_pii = false

    # Tag requests with request_id and user info (if available).
    config.before_send = lambda do |event, _hint|
      request_id = Current.respond_to?(:request_id) ? Current.request_id : nil
      user_identifier = Current.respond_to?(:user_identifier) ? Current.user_identifier : nil

      event.tags ||= {}
      event.tags["request_id"] = request_id if request_id.present?
      event.tags["user"] = user_identifier.present? ? user_identifier : "guest"

      if Current.respond_to?(:user_id) && Current.user_id.present?
        event.user = { id: Current.user_id }
        if ENV["SENTRY_INCLUDE_EMAIL"] == "1" && Current.respond_to?(:user_email) && Current.user_email.present?
          event.user[:email] = Current.user_email
        end
      end

      event
    end
  end
end
