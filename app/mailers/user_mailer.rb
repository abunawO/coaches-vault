class UserMailer < ApplicationMailer
  def email_verification(user)
    @user = user
    @verify_url = verify_email_url(token: user.signed_id(purpose: :email_verification, expires_in: 2.days))
    mail to: user.email, subject: "Confirm your email for MyCoachVault"
  end

  def password_reset(user)
    @user = user
    token = user.signed_id(purpose: :password_reset, expires_in: 2.hours)
    @reset_url = password_reset_url(token: token)
    mail to: user.email, subject: "Reset your password for MyVault"
  end
end
