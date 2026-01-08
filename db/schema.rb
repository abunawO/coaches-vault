# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.1].define(version: 2025_12_22_000000) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "pg_catalog.plpgsql"

  create_table "active_storage_attachments", force: :cascade do |t|
    t.bigint "blob_id", null: false
    t.datetime "created_at", null: false
    t.string "name", null: false
    t.bigint "record_id", null: false
    t.string "record_type", null: false
    t.index ["record_type", "record_id", "name", "blob_id"], name: "index_active_storage_attachments_uniqueness", unique: true
  end

  create_table "active_storage_blobs", force: :cascade do |t|
    t.string "analyzed", default: "f", null: false
    t.bigint "byte_size", null: false
    t.string "checksum"
    t.string "content_type"
    t.datetime "created_at", null: false
    t.string "filename", null: false
    t.string "identified", default: "f", null: false
    t.string "key", null: false
    t.text "metadata"
    t.string "service_name", null: false
  end

  create_table "active_storage_variant_records", force: :cascade do |t|
    t.bigint "blob_id", null: false
    t.string "variation_digest", null: false
    t.index ["blob_id", "variation_digest"], name: "index_active_storage_variant_records_uniqueness", unique: true
  end

  create_table "categories", force: :cascade do |t|
    t.bigint "coach_id", null: false
    t.datetime "created_at", null: false
    t.text "description"
    t.string "name", null: false
    t.integer "position", default: 0, null: false
    t.datetime "updated_at", null: false
    t.string "visibility", default: "visible", null: false
    t.index ["coach_id", "position"], name: "index_categories_on_coach_id_and_position"
    t.index ["coach_id"], name: "index_categories_on_coach_id"
  end

  create_table "category_lessons", force: :cascade do |t|
    t.bigint "category_id", null: false
    t.datetime "created_at", null: false
    t.bigint "lesson_id", null: false
    t.integer "position", default: 0, null: false
    t.datetime "updated_at", null: false
    t.index ["category_id", "lesson_id"], name: "index_category_lessons_on_category_id_and_lesson_id", unique: true
    t.index ["category_id"], name: "index_category_lessons_on_category_id"
    t.index ["lesson_id"], name: "index_category_lessons_on_lesson_id"
  end

  create_table "coach_profiles", force: :cascade do |t|
    t.string "avatar_url"
    t.text "bio"
    t.datetime "created_at", null: false
    t.string "display_name", null: false
    t.string "instagram_url"
    t.string "location"
    t.string "slug", null: false
    t.string "tiktok_url"
    t.datetime "updated_at", null: false
    t.bigint "user_id", null: false
    t.boolean "verified", default: false, null: false
    t.string "website_url"
    t.string "youtube_url"
    t.index ["slug"], name: "index_coach_profiles_on_slug", unique: true
    t.index ["user_id"], name: "index_coach_profiles_on_user_id", unique: true
  end

  create_table "comments", force: :cascade do |t|
    t.text "body", null: false
    t.datetime "created_at", null: false
    t.bigint "lesson_id", null: false
    t.integer "parent_id"
    t.datetime "updated_at", null: false
    t.bigint "user_id", null: false
    t.index ["lesson_id"], name: "index_comments_on_lesson_id"
    t.index ["parent_id"], name: "index_comments_on_parent_id"
    t.index ["user_id"], name: "index_comments_on_user_id"
  end

  create_table "conversations", force: :cascade do |t|
    t.bigint "coach_id", null: false
    t.datetime "created_at", null: false
    t.datetime "deleted_by_coach_at"
    t.datetime "deleted_by_student_at"
    t.bigint "student_id", null: false
    t.datetime "updated_at", null: false
    t.index ["coach_id"], name: "index_conversations_on_coach_id"
    t.index ["deleted_by_coach_at"], name: "index_conversations_on_deleted_by_coach_at"
    t.index ["deleted_by_student_at"], name: "index_conversations_on_deleted_by_student_at"
    t.index ["student_id", "coach_id"], name: "index_conversations_on_student_id_and_coach_id", unique: true
    t.index ["student_id"], name: "index_conversations_on_student_id"
  end

  create_table "favorites", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.bigint "lesson_id", null: false
    t.bigint "student_id", null: false
    t.datetime "updated_at", null: false
    t.index ["lesson_id"], name: "index_favorites_on_lesson_id"
    t.index ["student_id", "lesson_id"], name: "index_favorites_on_student_id_and_lesson_id", unique: true
    t.index ["student_id"], name: "index_favorites_on_student_id"
  end

  create_table "lesson_media", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.integer "kind", default: 0, null: false
    t.bigint "lesson_id", null: false
    t.integer "position", default: 0, null: false
    t.datetime "updated_at", null: false
    t.string "video_url"
    t.index ["lesson_id", "position"], name: "index_lesson_media_on_lesson_id_and_position"
    t.index ["lesson_id"], name: "index_lesson_media_on_lesson_id"
  end

  create_table "lesson_shares", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.bigint "lesson_id", null: false
    t.datetime "updated_at", null: false
    t.bigint "user_id", null: false
    t.index ["lesson_id", "user_id"], name: "index_lesson_shares_on_lesson_id_and_user_id", unique: true
    t.index ["lesson_id"], name: "index_lesson_shares_on_lesson_id"
    t.index ["user_id"], name: "index_lesson_shares_on_user_id"
  end

  create_table "lessons", force: :cascade do |t|
    t.bigint "coach_id", null: false
    t.datetime "created_at", null: false
    t.text "description"
    t.boolean "preview", default: false, null: false
    t.text "preview_text"
    t.string "title", null: false
    t.datetime "updated_at", null: false
    t.string "video_url"
    t.integer "visibility", default: 1, null: false
    t.index ["coach_id"], name: "index_lessons_on_coach_id"
  end

  create_table "messages", force: :cascade do |t|
    t.text "body", null: false
    t.bigint "conversation_id", null: false
    t.datetime "created_at", null: false
    t.datetime "read_at"
    t.bigint "sender_id", null: false
    t.datetime "updated_at", null: false
    t.index ["conversation_id", "created_at"], name: "index_messages_on_conversation_id_and_created_at"
    t.index ["conversation_id"], name: "index_messages_on_conversation_id"
    t.index ["read_at"], name: "index_messages_on_read_at"
    t.index ["sender_id"], name: "index_messages_on_sender_id"
  end

  create_table "notifications", force: :cascade do |t|
    t.bigint "actor_id"
    t.datetime "created_at", null: false
    t.string "message", null: false
    t.integer "notifiable_id", null: false
    t.string "notifiable_type", null: false
    t.datetime "read_at"
    t.bigint "recipient_id", null: false
    t.datetime "updated_at", null: false
    t.index ["actor_id"], name: "index_notifications_on_actor_id"
    t.index ["notifiable_type", "notifiable_id"], name: "index_notifications_on_notifiable_type_and_notifiable_id"
    t.index ["read_at"], name: "index_notifications_on_read_at"
    t.index ["recipient_id"], name: "index_notifications_on_recipient_id"
  end

  create_table "subscriptions", force: :cascade do |t|
    t.bigint "coach_id", null: false
    t.datetime "created_at", null: false
    t.datetime "ended_at"
    t.datetime "started_at", default: -> { "CURRENT_TIMESTAMP" }, null: false
    t.string "status", default: "active", null: false
    t.bigint "student_id", null: false
    t.datetime "updated_at", null: false
    t.index ["coach_id"], name: "index_subscriptions_on_coach_id"
    t.index ["student_id", "coach_id"], name: "index_subscriptions_on_student_coach_active", unique: true, where: "((status)::text = 'active'::text)"
    t.index ["student_id", "coach_id"], name: "index_subscriptions_on_student_id_and_coach_id"
    t.index ["student_id"], name: "index_subscriptions_on_student_id"
  end

  create_table "users", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "email", null: false
    t.datetime "email_verified_at"
    t.string "password_digest", null: false
    t.string "role", null: false
    t.datetime "updated_at", null: false
    t.datetime "verification_sent_at"
    t.index ["email"], name: "index_users_on_email", unique: true
    t.index ["email_verified_at"], name: "index_users_on_email_verified_at"
  end

  add_foreign_key "active_storage_attachments", "active_storage_blobs", column: "blob_id"
  add_foreign_key "active_storage_variant_records", "active_storage_blobs", column: "blob_id"
  add_foreign_key "categories", "users", column: "coach_id"
  add_foreign_key "category_lessons", "categories"
  add_foreign_key "category_lessons", "lessons"
  add_foreign_key "coach_profiles", "users"
  add_foreign_key "comments", "lessons"
  add_foreign_key "comments", "users"
  add_foreign_key "conversations", "users", column: "coach_id"
  add_foreign_key "conversations", "users", column: "student_id"
  add_foreign_key "favorites", "lessons"
  add_foreign_key "favorites", "users", column: "student_id"
  add_foreign_key "lesson_media", "lessons"
  add_foreign_key "lesson_shares", "lessons"
  add_foreign_key "lesson_shares", "users"
  add_foreign_key "lessons", "users", column: "coach_id"
  add_foreign_key "messages", "conversations"
  add_foreign_key "messages", "users", column: "sender_id"
  add_foreign_key "notifications", "users", column: "actor_id"
  add_foreign_key "notifications", "users", column: "recipient_id"
  add_foreign_key "subscriptions", "users", column: "coach_id"
  add_foreign_key "subscriptions", "users", column: "student_id"
end
