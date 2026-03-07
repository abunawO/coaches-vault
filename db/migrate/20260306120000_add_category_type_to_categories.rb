class AddCategoryTypeToCategories < ActiveRecord::Migration[7.1]
  DEFAULT_TYPE = "MMA Systems"

  def up
    add_column :categories, :category_type, :string

    Category.reset_column_information

    say_with_time "Backfilling categories.category_type" do
      Category.find_each do |category|
        inferred_type = infer_category_type(category)
        category.update_columns(category_type: inferred_type)
      end
    end

    change_column_default :categories, :category_type, from: nil, to: DEFAULT_TYPE
    change_column_null :categories, :category_type, false
    add_index :categories, [:coach_id, :category_type]
  end

  def down
    remove_index :categories, [:coach_id, :category_type]
    remove_column :categories, :category_type
  end

  private

  def infer_category_type(category)
    source = [category.name, category.description].compact.join(" ").downcase

    return "Striking" if source.match?(/\b(striking|boxing|kick|muay thai|punch)\b/)
    return "Wrestling" if source.match?(/\b(wrestling|takedown|shot|clinch)\b/)
    return "Grappling" if source.match?(/\b(grappling|jiu[- ]?jitsu|bjj|guard|sweep|submission)\b/)
    return "Fight IQ" if source.match?(/\b(fight iq|concept|principle|mindset|strategy|the void)\b/)
    return "Conditioning" if source.match?(/\b(conditioning|fitness|strength|mobility|recovery|endurance)\b/)
    return "MMA Systems" if source.match?(/\b(system|framework|sequence|chain|mma)\b/)

    DEFAULT_TYPE
  end
end
