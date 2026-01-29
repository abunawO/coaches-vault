class ApplicationMailer < ActionMailer::Base
  default from: ENV.fetch("DEFAULT_FROM_EMAIL", "support@mycoachvault.app")
  layout "mailer"
end
