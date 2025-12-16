class CreateSubscriptions < ActiveRecord::Migration[8.1]
  def change
    create_table :subscriptions do |t|
      t.references :student, null: false, foreign_key: { to_table: :users }
      t.references :coach, null: false, foreign_key: { to_table: :users }
      t.string :status, null: false, default: "active"
      t.datetime :started_at, null: false, default: -> { "CURRENT_TIMESTAMP" }
      t.datetime :ended_at

      t.timestamps
    end

    add_index :subscriptions, [:student_id, :coach_id]
    add_index :subscriptions, :student_id, unique: true, where: "status = 'active'", name: "index_subscriptions_on_student_id_active"
  end
end
