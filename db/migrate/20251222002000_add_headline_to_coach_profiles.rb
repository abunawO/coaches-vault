class AddHeadlineToCoachProfiles < ActiveRecord::Migration[7.1]
  def change
    add_column :coach_profiles, :headline, :string, limit: 120
  end
end
