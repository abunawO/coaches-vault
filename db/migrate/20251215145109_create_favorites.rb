class CreateFavorites < ActiveRecord::Migration[8.1]
  def change
    create_table :favorites do |t|
      t.references :student, null: false, foreign_key: { to_table: :users }
      t.references :lesson, null: false, foreign_key: true

      t.timestamps
    end

    add_index :favorites, [:student_id, :lesson_id], unique: true
  end
end
