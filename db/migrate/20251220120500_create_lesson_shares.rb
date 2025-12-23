class CreateLessonShares < ActiveRecord::Migration[7.1]
  def change
    create_table :lesson_shares do |t|
      t.references :lesson, null: false, foreign_key: true
      t.references :user, null: false, foreign_key: true

      t.timestamps
    end

    add_index :lesson_shares, [:lesson_id, :user_id], unique: true
  end
end
