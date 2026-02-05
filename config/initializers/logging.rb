# Minimal logging tweaks (text logs, no JSON).
Rails.application.config.after_initialize do
  # Keep formatter explicit to avoid environment-specific defaults drifting.
  Rails.logger.formatter ||= ::Logger::Formatter.new
end
