class RegistrationsController < ApplicationController
  skip_before_action :require_login, only: %i[new create]

  def new
    @user = User.new(role: "student")
  end

  def create
    @user = User.new(user_params)
    @user.role = "student" if @user.role.blank?

    if @user.save
      send_verification(@user)
      redirect_to verify_email_pending_path(email: @user.email), notice: "Check your email to verify your account."
    else
      render :new, status: :unprocessable_entity
    end
  end

  private

  def user_params
    params.require(:user).permit(:email, :password, :password_confirmation, :role)
  end

  def send_verification(user)
    user.update_column(:verification_sent_at, Time.current)
    UserMailer.email_verification(user).deliver_later
  end
end
