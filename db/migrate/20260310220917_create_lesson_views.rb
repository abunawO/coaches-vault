class CreateLessonViews < ActiveRecord::Migration[8.1]
  def change
    create_table :lesson_views do |t|
      t.references :user, null: false, foreign_key: true
      t.references :lesson, null: false, foreign_key: true
      t.integer :view_count, null: false, default: 0
      t.datetime :first_viewed_at
      t.datetime :last_viewed_at

      t.timestamps
    end

    add_index :lesson_views, %i[user_id lesson_id], unique: true
    add_index :lesson_views, :last_viewed_at
  end
end
