# config/initializers/aws.rb

Aws.config.update(
  region: ENV.fetch("AWS_REGION", "us-east-2"),
  s3: {
    ssl_ca_bundle: ENV["AWS_SSL_CA_BUNDLE"]
  }
)
