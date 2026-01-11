class CreateStudentProfiles < ActiveRecord::Migration[7.1]
  def change
    create_table :student_profiles do |t|
      t.references :user, null: false, index: { unique: true }, foreign_key: true
      t.string :display_name, null: false
      t.text :bio
      t.string :location

      t.timestamps
    end
  end
end
