class CreateCategories < ActiveRecord::Migration[7.1]
  def change
    create_table :categories do |t|
      t.string :name, null: false
      t.text :description
      t.integer :position, default: 0, null: false
      t.string :visibility, default: "visible", null: false
      t.references :coach, null: false, foreign_key: { to_table: :users }

      t.timestamps
    end

    create_table :category_lessons do |t|
      t.references :category, null: false, foreign_key: true
      t.references :lesson, null: false, foreign_key: true
      t.integer :position, default: 0, null: false

      t.timestamps
    end

    add_index :category_lessons, [:category_id, :lesson_id], unique: true
    add_index :categories, [:coach_id, :position]
  end
end
