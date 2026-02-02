class EmailVerificationsController < ApplicationController
  skip_before_action :require_login, only: %i[show pending resend]

  def pending
    @email = params[:email].to_s.presence
  end

  def resend
    email = params[:email].to_s.downcase.strip
    user = User.find_by(email: email)

    if user && !user.email_verified?
      user.update_column(:verification_sent_at, Time.current)
      UserMailer.email_verification(user).deliver_now
    end

    redirect_to verify_email_pending_path(email: email.presence), notice: "If an account exists for #{email.present? ? email : 'that email'}, we sent a new verification link."
  end

  def show
    token = params[:token].to_s
    user = User.find_signed!(token, purpose: :email_verification)

    if user.email_verified?
      redirect_to login_path, notice: "Email already verified. Please log in."
    else
      user.update!(email_verified_at: Time.current)
      redirect_to login_path, notice: "Email verified — you can log in now."
    end
  rescue ActiveSupport::MessageVerifier::InvalidSignature, ActiveSupport::MessageVerifier::InvalidMessage
    redirect_to verify_email_pending_path, alert: "Verification link is invalid or expired. Please request a new one."
  end
end
