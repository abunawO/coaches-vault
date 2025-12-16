class UpdateSubscriptionIndexesForMultipleCoaches < ActiveRecord::Migration[8.1]
  def change
    remove_index :subscriptions, name: "index_subscriptions_on_student_id_active"

    add_index :subscriptions,
              [:student_id, :coach_id],
              unique: true,
              where: "status = 'active'",
              name: "index_subscriptions_on_student_coach_active"
  end
end
