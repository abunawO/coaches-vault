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
coach1_profile.update!(
  avatar_url: "https://via.placeholder.com/200x200.png?text=Coach+1",
  location: "Austin, TX",
  verified: true,
  instagram_url: "https://instagram.com/example1",
  youtube_url: "https://youtube.com/@example1",
  website_url: "https://coach1.example.com",
  tiktok_url: "https://tiktok.com/@example1"
)

coach2_profile = ensure_coach_profile(user: coach2, slug: "coach-test-2", display_name: "Coach Test 2", bio: "Coach Test 2 bio")
coach2_profile.update!(
  avatar_url: "https://via.placeholder.com/200x200.png?text=Coach+2",
  location: "Denver, CO",
  verified: false,
  instagram_url: "https://instagram.com/example2",
  youtube_url: "https://youtube.com/@example2",
  website_url: "https://coach2.example.com",
  tiktok_url: "https://tiktok.com/@example2"
)

coach1_lessons = [
  { title: "Distance & Angles 101", description: "Managing range and angles effectively.", video_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" },
  { title: "The Void: Green / Yellow / Red", description: "Color system for situational awareness.", video_url: "https://vimeo.com/76979871" },
  { title: "Footwork: Exit and Re-enter", description: "Footwork patterns to disengage and re-enter safely.", video_url: "https://www.youtube.com/watch?v=5NV6Rdv1a3I" },
  { title: "Pressure and Pace", description: "Control tempo and pressure in exchanges.", video_url: "https://www.youtube.com/watch?v=ysz5S6PUM-U" },
  { title: "Angles Under Fire", description: "Counter aggressive entries with sharp angles.", video_url: "https://www.youtube.com/watch?v=HgzGwKwLmgM" },
  { title: "Ring Craft Basics", description: "Footwork to own the center and exits.", video_url: "https://www.youtube.com/watch?v=2vjPBrBU-TM" }
]

coach2_lessons = [
  { title: "Guard Passing Basics", description: "Fundamentals of stable guard passing.", video_url: "https://www.youtube.com/watch?v=kXYiU_JCYtU" },
  { title: "Front Headlock System", description: "Entries and finishes from front headlock.", video_url: "https://vimeo.com/148751763" },
  { title: "Defense Layering", description: "Layered defense strategies.", video_url: "https://www.youtube.com/watch?v=3AtDnEC4zak" },
  { title: "Back Attacks Flow", description: "Systematic back attacks.", video_url: "https://www.youtube.com/watch?v=uelHwf8o7_U" },
  { title: "Takedown Chains", description: "Linking takedowns together.", video_url: "https://www.youtube.com/watch?v=4NRXx6U8ABQ" },
  { title: "Leg Entanglement 101", description: "Intro to safe entries for legs.", video_url: "https://www.youtube.com/watch?v=fLexgOxsZu0" }
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

[[student1, coach1], [student2, coach2]].each do |student, coach|
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

# Seed a sample conversation/message to generate notifications for students
conversation_with_student1 = Conversation.find_or_create_by!(student: student1, coach: coach1)
conversation_with_student2 = Conversation.find_or_create_by!(student: student2, coach: coach2)

unless conversation_with_student1.messages.exists?(body: "Welcome to the vault", sender: coach1)
  conversation_with_student1.messages.create!(sender: coach1, body: "Welcome to the vault")
end

unless conversation_with_student1.messages.exists?(body: "Thanks coach, excited to learn!", sender: student1)
  conversation_with_student1.messages.create!(sender: student1, body: "Thanks coach, excited to learn!")
end

unless conversation_with_student2.messages.exists?(body: "Welcome to the vault", sender: coach2)
  conversation_with_student2.messages.create!(sender: coach2, body: "Welcome to the vault")
end

unless conversation_with_student2.messages.exists?(body: "Appreciate it!", sender: student2)
  conversation_with_student2.messages.create!(sender: student2, body: "Appreciate it!")
end

seeded_coaches = [coach1, coach2].map(&:email)
seeded_students = [student1, student2].map(&:email)
seeded_lessons = Lesson.count
seeded_subscriptions = Subscription.count

puts "Seeded coaches: #{seeded_coaches.join(', ')}"
puts "Seeded students: #{seeded_students.join(', ')}"
puts "Seeded lessons count: #{seeded_lessons}"
puts "Seeded subscriptions: #{seeded_subscriptions}"
