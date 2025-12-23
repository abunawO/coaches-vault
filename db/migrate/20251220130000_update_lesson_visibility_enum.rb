class UpdateLessonVisibilityEnum < ActiveRecord::Migration[7.1]
  def up
    # Existing values: 0=subscribers, 1=selected_subscribers
    # New values: 0=free, 1=subscribers, 2=private
    execute <<~SQL
      UPDATE lessons SET visibility = visibility + 1;
    SQL
    change_column_default :lessons, :visibility, from: 0, to: 1
  end

  def down
    execute <<~SQL
      UPDATE lessons SET visibility = visibility - 1 WHERE visibility > 0;
    SQL
    change_column_default :lessons, :visibility, from: 1, to: 0
  end
end
