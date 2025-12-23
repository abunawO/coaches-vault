class AddPreviewFieldsToLessons < ActiveRecord::Migration[7.1]
  def change
    add_column :lessons, :preview, :boolean, null: false, default: false
    add_column :lessons, :preview_text, :text
  end
end
