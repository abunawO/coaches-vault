return unless defined?(Aws)
return if ENV["AWS_SSL_CA_BUNDLE"].blank?

Aws.config.update(ssl_ca_bundle: ENV["AWS_SSL_CA_BUNDLE"])
