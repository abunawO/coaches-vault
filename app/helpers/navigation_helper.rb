module NavigationHelper
  def safe_return_path(default_path)
    candidate =
      if params[:return_to].present? && params[:return_to].start_with?("/") && !params[:return_to].start_with?("//")
        params[:return_to]
      elsif request.referer.present?
        begin
          uri = URI(request.referer)
          uri.host == request.host ? uri.request_uri : nil
        rescue URI::InvalidURIError
          nil
        end
      end

    candidate.presence || default_path
  end
end
