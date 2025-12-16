class CreateLessons < ActiveRecord::Migration[8.1]
  def change
    create_table :lessons do |t|
      t.references :coach, null: false, foreign_key: { to_table: :users }
      t.string :title, null: false
      t.text :description
      t.string :video_url, null: false

      t.timestamps
    end

  end
end
