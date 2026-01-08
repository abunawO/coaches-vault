class UserMailer < ApplicationMailer
  def email_verification(user)
    @user = user
    @verify_url = verify_email_url(token: user.signed_id(purpose: :email_verification, expires_in: 2.days))
    mail to: user.email, subject: "Verify your email for MyVault"
  end
end
