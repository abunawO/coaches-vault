class StudentProfilesController < ApplicationController
  before_action :require_login
  before_action :require_student
  before_action :set_student_profile

  def edit; end

  def update
    if @student_profile.update(student_profile_params)
      if params[:student_profile][:avatar].present?
        @student_profile.avatar.attach(params[:student_profile][:avatar])
      end
      redirect_to root_path, notice: "Profile updated."
    else
      render :edit, status: :unprocessable_entity
    end
  end

  private

  def require_student
    return if current_user&.student?

    redirect_to root_path, alert: "You must be a student to edit your profile."
  end

  def set_student_profile
    @student_profile = current_user.student_profile
    return if @student_profile.present?

    default_name = current_user.email.split("@").first
    @student_profile = current_user.create_student_profile!(display_name: default_name)
  end

  def student_profile_params
    params.require(:student_profile).permit(:display_name, :bio, :location, :avatar)
  end
end
