class AddProfileFieldsToCoachProfiles < ActiveRecord::Migration[7.1]
  def change
    add_column :coach_profiles, :avatar_url, :string
    add_column :coach_profiles, :location, :string
    add_column :coach_profiles, :verified, :boolean, default: false, null: false
    add_column :coach_profiles, :instagram_url, :string
    add_column :coach_profiles, :youtube_url, :string
    add_column :coach_profiles, :website_url, :string
    add_column :coach_profiles, :tiktok_url, :string
  end
end
