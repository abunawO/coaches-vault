class PasswordResetsController < ApplicationController
  skip_before_action :require_login, only: %i[new create pending resend edit update]

  def new; end

  def create
    email = params[:email].to_s.strip.downcase
    user = User.find_by("lower(email) = ?", email)

    if user
      send_reset(user)
    end

    redirect_to password_reset_pending_path(email: email), notice: "If an account exists for that email, we sent a reset link."
  end

  def pending
    @email = params[:email].to_s.presence
  end

  def resend
    email = params[:email].to_s.strip.downcase
    user = User.find_by("lower(email) = ?", email)
    send_reset(user) if user
    redirect_to password_reset_pending_path(email: email.presence), notice: "If an account exists for that email, we sent a reset link."
  end

  def edit
    token = params[:token].to_s
    @user = User.find_signed!(token, purpose: :password_reset)
  rescue ActiveSupport::MessageVerifier::InvalidSignature, ActiveSupport::MessageVerifier::InvalidMessage
    redirect_to forgot_password_path, alert: "Reset link expired or invalid. Request a new one."
  end

  def update
    token = params[:token].to_s
    @user = User.find_signed!(token, purpose: :password_reset)

    if @user.update(password_params)
      @user.update_column(:password_reset_at, Time.current) if @user.respond_to?(:password_reset_at)
      redirect_to login_path, notice: "Password updated. Please log in."
    else
      render :edit, status: :unprocessable_entity
    end
  rescue ActiveSupport::MessageVerifier::InvalidSignature, ActiveSupport::MessageVerifier::InvalidMessage
    redirect_to forgot_password_path, alert: "Reset link expired or invalid. Request a new one."
  end

  private

  def password_params
    params.require(:user).permit(:password, :password_confirmation)
  end

  def send_reset(user)
    user.update_column(:password_reset_sent_at, Time.current) if user.respond_to?(:password_reset_sent_at)
    UserMailer.password_reset(user).deliver_now
  end
end
