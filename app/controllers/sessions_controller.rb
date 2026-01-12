class SessionsController < ApplicationController
  skip_before_action :require_login, only: %i[new create]

  def new
    redirect_to root_path, notice: "You are already logged in." if logged_in?
  end

  def create
    user = User.find_by(email: params[:email])

    if user&.authenticate(params[:password])
      unless user.email_verified?
        @unverified_email = user.email
        flash.now[:alert] = "Please verify your email before logging in."
        return render :new, status: :unprocessable_entity
      end

      session[:user_id] = user.id
      if user.coach? && user.coach_profile.blank?
        redirect_to edit_my_coach_profile_path, notice: "Finish your coach profile to activate your vault."
      else
        redirect_to root_path, notice: "Logged in successfully."
      end
    else
      flash.now[:alert] = "Invalid email or password."
      render :new, status: :unprocessable_entity
    end
  end

  def destroy
    reset_session
    redirect_to login_path, notice: "Logged out successfully."
  end
end
