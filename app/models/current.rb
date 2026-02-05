class Current < ActiveSupport::CurrentAttributes
  attribute :user, :user_id, :user_email, :request_id, :remote_ip

  # Convenience helpers for tags
  def user_identifier
    user_id || user_email
  end

  class << self
    def user_identifier
      instance.user_identifier
    end
  end
end
