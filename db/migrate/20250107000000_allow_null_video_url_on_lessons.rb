class AllowNullVideoUrlOnLessons < ActiveRecord::Migration[8.1]
  def change
    change_column_null :lessons, :video_url, true
  end
end
