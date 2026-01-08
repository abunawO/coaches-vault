class AddEmailVerificationToUsers < ActiveRecord::Migration[7.1]
  def change
    add_column :users, :email_verified_at, :datetime
    add_column :users, :verification_sent_at, :datetime

    add_index :users, :email_verified_at
  end
end
