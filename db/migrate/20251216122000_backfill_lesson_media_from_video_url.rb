class BackfillLessonMediaFromVideoUrl < ActiveRecord::Migration[7.1]
  def up
    say_with_time "Backfilling lesson_media from lessons.video_url" do
      Lesson.reset_column_information
      Lesson.find_each do |lesson|
        next if lesson.video_url.blank?
        lesson.lesson_media.create!(
          kind: :video,
          video_url: lesson.video_url,
          position: 0
        )
      end
    end
  end

  def down
    # no-op
  end
end
