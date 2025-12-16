# This file should ensure the existence of records required to run the application in every environment (production,
# development, test). The code here should be idempotent so that it can be executed at any point in every environment.
# The data can then be loaded with the bin/rails db:seed command (or created alongside the database with db:setup).

def ensure_user(email:, role:)
  user = User.find_or_initialize_by(email: email)
  user.role = role
  user.password = "password" if user.password_digest.blank?
  user.password_confirmation = "password" if user.password_digest.blank?
  user.save!(validate: false) unless user.valid? # ensure password digest exists
  user.save!
  user
end

coach1 = ensure_user(email: "coach@test.com", role: "coach")
coach2 = ensure_user(email: "coach2@test.com", role: "coach")
student1 = ensure_user(email: "student@test.com", role: "student")
student2 = ensure_user(email: "student2@test.com", role: "student")

def ensure_coach_profile(user:, slug:, display_name:, bio:)
  profile = CoachProfile.find_or_initialize_by(slug: slug)
  profile.user = user
  profile.display_name = display_name
  profile.bio = bio
  profile.save!
  profile
end

coach1_profile = ensure_coach_profile(user: coach1, slug: "coach-test", display_name: "Coach Test", bio: "Coach Test bio")
coach2_profile = ensure_coach_profile(user: coach2, slug: "coach-test-2", display_name: "Coach Test 2", bio: "Coach Test 2 bio")

coach1_lessons = [
  { title: "Distance & Angles 101", description: "Managing range and angles effectively.", video_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" },
  { title: "The Void: Green / Yellow / Red", description: "Color system for situational awareness.", video_url: "https://vimeo.com/76979871" },
  { title: "Footwork: Exit and Re-enter", description: "Footwork patterns to disengage and re-enter safely.", video_url: "https://www.youtube.com/watch?v=5NV6Rdv1a3I" }
]

coach2_lessons = [
  { title: "Guard Passing Basics", description: "Fundamentals of stable guard passing.", video_url: "https://www.youtube.com/watch?v=kXYiU_JCYtU" },
  { title: "Front Headlock System", description: "Entries and finishes from front headlock.", video_url: "https://vimeo.com/148751763" },
  { title: "Defense Layering", description: "Layered defense strategies.", video_url: "https://www.youtube.com/watch?v=3AtDnEC4zak" }
]

[ [coach1, coach1_lessons], [coach2, coach2_lessons] ].each do |coach, lessons|
  lessons.each do |attrs|
    lesson = coach.lessons.find_or_initialize_by(title: attrs[:title])
    lesson.description = attrs[:description]
    lesson.video_url = attrs[:video_url]
    lesson.save!
  end
end

def cancel_other_active_subscriptions(student, keep_coach_id)
end

[[student1, coach1], [student1, coach2]].each do |student, coach|
  scope = Subscription.where(student: student, coach: coach)
  sub = scope.where(status: "active").first || scope.first_or_initialize
  sub.status = "active"
  sub.started_at ||= Time.current
  sub.ended_at = nil
  sub.save!
end

first_lesson = coach1.lessons.first
if first_lesson
  student_comment = Comment.find_or_create_by!(lesson: first_lesson, user: student1, parent_id: nil) do |comment|
    comment.body = "Great lesson! The angle breakdown was super helpful."
  end

  Comment.find_or_create_by!(lesson: first_lesson, user: coach1, parent: student_comment) do |reply|
    reply.body = "Glad it helped! Drill the entries slowly first."
  end
end

seeded_coaches = [coach1, coach2].map(&:email)
seeded_students = [student1, student2].map(&:email)
seeded_lessons = Lesson.count
seeded_subscriptions = Subscription.count

puts "Seeded coaches: #{seeded_coaches.join(', ')}"
puts "Seeded students: #{seeded_students.join(', ')}"
puts "Seeded lessons count: #{seeded_lessons}"
puts "Seeded subscriptions: #{seeded_subscriptions}"
