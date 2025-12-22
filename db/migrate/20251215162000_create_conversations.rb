class CreateConversations < ActiveRecord::Migration[7.1]
  def change
    create_table :conversations do |t|
      t.references :student, null: false, foreign_key: { to_table: :users }
      t.references :coach, null: false, foreign_key: { to_table: :users }

      t.timestamps
    end

    add_index :conversations, [:student_id, :coach_id], unique: true
  end
end
