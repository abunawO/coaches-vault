class AddVisibilityToLessons < ActiveRecord::Migration[7.1]
  def change
    add_column :lessons, :visibility, :integer, default: 0, null: false
  end
end
