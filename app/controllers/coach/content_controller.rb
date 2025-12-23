class Coach::ContentController < ApplicationController
  before_action :require_login
  before_action :require_coach

  def index
    @tab = params[:tab].presence_in(%w[all free subscribers private]) || "all"
    @q = params[:q].to_s.strip
    @sort = params[:sort].presence_in(%w[newest oldest az]) || "newest"

    @lessons = current_user.lessons.includes(:lesson_shares)

    case @tab
    when "free"
      @lessons = @lessons.where(visibility: Lesson.visibilities[:free])
    when "subscribers"
      @lessons = @lessons.where(visibility: Lesson.visibilities[:subscribers])
    when "private"
      @lessons = @lessons.where(visibility: Lesson.visibilities[:restricted])
    end

    if @q.present?
      like = "%#{ActiveRecord::Base.sanitize_sql_like(@q)}%"
      @lessons = @lessons.where("lessons.title ILIKE :q OR lessons.description ILIKE :q", q: like)
    end

    @lessons = case @sort
               when "oldest"
                 @lessons.order(created_at: :asc)
               when "az"
                 @lessons.order(title: :asc)
               else
                 @lessons.order(created_at: :desc)
               end
  end

  private

  def require_coach
    return if current_user&.coach?

    redirect_to root_path, alert: "You must be a coach to do that."
  end
end
