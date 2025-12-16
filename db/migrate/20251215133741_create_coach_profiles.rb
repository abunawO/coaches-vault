class CreateCoachProfiles < ActiveRecord::Migration[8.1]
  def change
    create_table :coach_profiles do |t|
      t.references :user, null: false, foreign_key: true, index: { unique: true }
      t.string :display_name, null: false
      t.text :bio
      t.string :slug, null: false

      t.timestamps
    end

    add_index :coach_profiles, :slug, unique: true
  end
end
