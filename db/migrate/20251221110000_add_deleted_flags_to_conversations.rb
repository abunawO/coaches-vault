class AddDeletedFlagsToConversations < ActiveRecord::Migration[7.1]
  def change
    add_column :conversations, :deleted_by_student_at, :datetime
    add_column :conversations, :deleted_by_coach_at, :datetime
    add_index :conversations, :deleted_by_student_at
    add_index :conversations, :deleted_by_coach_at
  end
end
