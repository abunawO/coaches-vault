class CreateActiveStorageTables < ActiveRecord::Migration[7.1]
  def change
    create_table :active_storage_blobs, id: :primary_key do |t|
      t.string   :key,          null: false
      t.string   :filename,     null: false
      t.string   :content_type
      t.text     :metadata
      t.string   :service_name, null: false
      t.bigint   :byte_size,    null: false
      t.string   :checksum
      t.datetime :created_at,   null: false
      t.string   :identified,   default: "f", null: false
      t.string   :analyzed,     default: "f", null: false
    end

    create_table :active_storage_attachments, id: :primary_key do |t|
      t.string     :name,     null: false
      t.string     :record_type, null: false
      t.bigint     :record_id,   null: false
      t.bigint     :blob_id,     null: false
      t.datetime   :created_at,  null: false
      t.index %i[record_type record_id name blob_id], name: "index_active_storage_attachments_uniqueness", unique: true
      t.foreign_key :active_storage_blobs, column: :blob_id
    end

    create_table :active_storage_variant_records, id: :primary_key do |t|
      t.belongs_to :blob, null: false, index: false, foreign_key: { to_table: :active_storage_blobs }
      t.string :variation_digest, null: false
      t.index %i[blob_id variation_digest], name: "index_active_storage_variant_records_uniqueness", unique: true
    end
  end
end
