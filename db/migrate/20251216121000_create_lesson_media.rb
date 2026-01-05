class CreateLessonMedia < ActiveRecord::Migration[7.1]
  def change
    create_table :lesson_media do |t|
      t.references :lesson, null: false, foreign_key: true
      t.integer :kind, null: false, default: 0
      t.string :video_url
      t.integer :position, null: false, default: 0
      t.timestamps
    end

    add_index :lesson_media, %i[lesson_id position]
  end
end
