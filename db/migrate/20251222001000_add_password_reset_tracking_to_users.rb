class AddPasswordResetTrackingToUsers < ActiveRecord::Migration[7.1]
  def change
    add_column :users, :password_reset_sent_at, :datetime
    add_column :users, :password_reset_at, :datetime
  end
end
