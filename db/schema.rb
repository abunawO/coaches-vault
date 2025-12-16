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

ActiveRecord::Schema[8.1].define(version: 2025_12_15_153251) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "pg_catalog.plpgsql"

  create_table "coach_profiles", force: :cascade do |t|
    t.text "bio"
    t.datetime "created_at", null: false
    t.string "display_name", null: false
    t.string "slug", null: false
    t.datetime "updated_at", null: false
    t.bigint "user_id", null: false
    t.index ["slug"], name: "index_coach_profiles_on_slug", unique: true
    t.index ["user_id"], name: "index_coach_profiles_on_user_id", unique: true
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

  create_table "lessons", force: :cascade do |t|
    t.bigint "coach_id", null: false
    t.datetime "created_at", null: false
    t.text "description"
    t.string "title", null: false
    t.datetime "updated_at", null: false
    t.string "video_url", null: false
    t.index ["coach_id"], name: "index_lessons_on_coach_id"
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
    t.string "password_digest", null: false
    t.string "role", null: false
    t.datetime "updated_at", null: false
    t.index ["email"], name: "index_users_on_email", unique: true
  end

  add_foreign_key "coach_profiles", "users"
  add_foreign_key "favorites", "lessons"
  add_foreign_key "favorites", "users", column: "student_id"
  add_foreign_key "lessons", "users", column: "coach_id"
  add_foreign_key "subscriptions", "users", column: "coach_id"
  add_foreign_key "subscriptions", "users", column: "student_id"
end
