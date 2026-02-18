class CommentsController < ApplicationController
  before_action :require_login
  before_action :set_lesson
  before_action :set_parent_comment, only: :create
  before_action :set_comment, only: %i[update destroy]
  before_action :authorize_comment_owner!, only: %i[update destroy]

  def create
    unless authorized_to_comment?
      redirect_back fallback_location: lesson_path(@lesson), alert: "You cannot comment on this lesson." and return
    end

    comment = @lesson.comments.build(comment_params.merge(user: current_user, parent: @parent_comment))

    if comment.save
      create_notification(comment)
      redirect_back fallback_location: lesson_path(@lesson), notice: "Comment posted."
    else
      redirect_back fallback_location: lesson_path(@lesson), alert: "Could not post comment."
    end
  end

  def update
    if @comment.update(comment_params)
      redirect_back fallback_location: lesson_path(@lesson), notice: "Comment updated."
    else
      redirect_back fallback_location: lesson_path(@lesson), alert: "Could not update comment."
    end
  end

  def destroy
    if @comment.destroy
      redirect_back fallback_location: lesson_path(@lesson), notice: "Comment deleted."
    else
      redirect_back fallback_location: lesson_path(@lesson), alert: "Could not delete comment."
    end
  end

  private

  def set_lesson
    @lesson = Lesson.find(params[:lesson_id])
  end

  def set_parent_comment
    @parent_comment = Comment.find_by(id: params[:comment][:parent_id]) if params[:comment]&.[](:parent_id).present?
  end

  def set_comment
    @comment = @lesson.comments.find(params[:id])
  end

  def comment_params
    params.require(:comment).permit(:body)
  end

  def authorized_to_comment?
    return false unless current_user

    if @parent_comment.present?
      current_user.coach? && @lesson.coach_id == current_user.id
    else
      current_user.student? && current_user.subscribed_to?(@lesson.coach)
    end
  end

  def authorize_comment_owner!
    return if @comment.user_id == current_user.id

    redirect_back fallback_location: lesson_path(@lesson), alert: "You can only modify your own comments."
  end

  def create_notification(comment)
    return unless current_user

    if comment.parent_id.nil? && current_user.student?
      recipient = @lesson.coach
      return if recipient == current_user

      Notification.create!(
        recipient: recipient,
        actor: current_user,
        notifiable: comment,
        message: "New comment on #{comment.lesson.title} from #{current_user.email}"
      )
    elsif comment.parent_id.present? && current_user.coach?
      recipient = @parent_comment&.user
      return if recipient.nil? || recipient == current_user

      Notification.create!(
        recipient: recipient,
        actor: current_user,
        notifiable: comment,
        message: "Coach replied to your comment on #{comment.lesson.title}"
      )
    end
  end
end
