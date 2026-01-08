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

def cancel_other_active_subscriptions(student, keep_coach_id)
end

def seed_coach_vault(coach)
  coach.categories.destroy_all
  coach.lessons.destroy_all

  icon_path = Rails.root.join("public", "icon.png")
  categories = [
    {
      name: "Jiu Jitsu",
      description: "Grappling fundamentals, submissions, and transitions.",
      lessons: [
        { title: "Arm Bar Setup", visibility: "subscribers", preview_text: "Smooth setup from guard into a tight finish.",
          description: "Drill the classic arm bar from closed guard with attention to hips, head control, and breaking posture. We connect the back take if the arm bar fails.",
          media: [{ kind: "video", url: "https://www.youtube.com/watch?v=s7hRzIc_yAY" }, { kind: "image" }] },
        { title: "Guard Retention Blueprint", visibility: "free",
          description: "Stay in guard against heavy pressure: frames, hip escapes, and guard recovery routes to half guard or butterfly.",
          media: [{ kind: "video", url: "https://www.youtube.com/watch?v=ysz5S6PUM-U" }] },
        { title: "Triangle System Entries", visibility: "subscribers",
          description: "Chain triangles from wrist control and collar ties; finish details and contingencies into omoplata or arm bar.",
          media: [{ kind: "video", url: "https://vimeo.com/76979871" }, { kind: "image" }] },
        { title: "Passing Open Guards", visibility: "restricted",
          description: "Pressure passing vs. butterfly and shin-to-shin with clear checkpoints and grips.",
          media: [{ kind: "video", url: "https://www.youtube.com/watch?v=kXYiU_JCYtU" }] },
        { title: "Back Control Fundamentals", visibility: "subscribers",
          description: "Seatbelt, hooks, and head height. Maintain control and finish with short choke or RNC.",
          media: [{ kind: "video", url: "https://www.youtube.com/watch?v=HgzGwKwLmgM" }] }
      ]
    },
    {
      name: "Wrestling",
      description: "Stand-up control, takedowns, and rides.",
      lessons: [
        { title: "Snap Down to Front Headlock", visibility: "free",
          description: "Snap mechanics, go-behinds, and basic choke threats from front headlock.",
          media: [{ kind: "video", url: "https://vimeo.com/148751763" }, { kind: "image" }] },
        { title: "Single Leg Finishes", visibility: "subscribers",
          description: "Options when opponent whizzers or sprawls: run the pipe, shelf, and trip series.",
          media: [{ kind: "video", url: "https://www.youtube.com/watch?v=4NRXx6U8ABQ" }] },
        { title: "Chain Wrestling Flow", visibility: "restricted",
          description: "Linking shots: double to high-crotch to knee tap based on opponent reactions.",
          media: [{ kind: "video", url: "https://www.youtube.com/watch?v=fLexgOxsZu0" }] },
        { title: "Mat Return Series", visibility: "subscribers",
          description: "Return a standing opponent safely: lift-and-return and trip variations.",
          media: [{ kind: "video", url: "https://www.youtube.com/watch?v=3AtDnEC4zak" }] }
      ]
    },
    {
      name: "Striking",
      description: "Boxing and kickboxing concepts for MMA.",
      lessons: [
        { title: "Jab Craft", visibility: "free",
          description: "Long guard, probing jabs, and setting up the cross with footwork.",
          media: [{ kind: "video", url: "https://www.youtube.com/watch?v=5NV6Rdv1a3I" }, { kind: "image" }] },
        { title: "Low Kick Mechanics", visibility: "subscribers",
          description: "Set up and finish low kicks without getting caught; exit footwork.",
          media: [{ kind: "video", url: "https://www.youtube.com/watch?v=2vjPBrBU-TM" }] },
        { title: "Counter Fighting Essentials", visibility: "subscribers",
          description: "Slip, parry, and pull counters; timing drills to build reactions.",
          media: [{ kind: "video", url: "https://www.youtube.com/watch?v=uelHwf8o7_U" }] },
        { title: "Clinch Striking", visibility: "restricted",
          description: "Elbows, knees, and posture control inside the clinch.",
          media: [{ kind: "video", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" }] }
      ]
    },
    {
      name: "MMA Systems",
      description: "Blending striking and grappling into coherent systems.",
      lessons: [
        { title: "Cage Control Basics", visibility: "subscribers",
          description: "Pinning opponents to the fence, underhook battles, and head position.",
          media: [{ kind: "video", url: "https://www.youtube.com/watch?v=ysz5S6PUM-U" }, { kind: "image" }] },
        { title: "Shot Entries off Feints", visibility: "subscribers",
          description: "Use level changes and shoulder feints to create takedown windows.",
          media: [{ kind: "video", url: "https://www.youtube.com/watch?v=2vjPBrBU-TM" }] },
        { title: "Ground and Pound Safety", visibility: "restricted",
          description: "Posture, base, and strike selection to avoid submissions.",
          media: [{ kind: "video", url: "https://www.youtube.com/watch?v=HgzGwKwLmgM" }] },
        { title: "Transition to Back Takes", visibility: "subscribers",
          description: "Chain guard passes into back exposure and secure hooks quickly.",
          media: [{ kind: "video", url: "https://vimeo.com/76979871" }] }
      ]
    },
    {
      name: "Fight IQ",
      description: "Strategy, pacing, and in-fight decision making.",
      lessons: [
        { title: "Pace Management", visibility: "free",
          description: "Surge and settle tactics to win rounds without burning out.",
          media: [{ kind: "video", url: "https://www.youtube.com/watch?v=ysz5S6PUM-U" }] },
        { title: "Reading Opponent Habits", visibility: "subscribers",
          description: "Identify patterns in the first minute and build traps.",
          media: [{ kind: "video", url: "https://www.youtube.com/watch?v=HgzGwKwLmgM" }] },
        { title: "Corner Communication", visibility: "subscribers",
          description: "What to listen for between rounds and how to adjust.",
          media: [{ kind: "video", url: "https://www.youtube.com/watch?v=4NRXx6U8ABQ" }] },
        { title: "Finishing the Round Strong", visibility: "restricted",
          description: "Winning the last 30 seconds: positional dominance vs. flurries.",
          media: [{ kind: "video", url: "https://vimeo.com/148751763" }] }
      ]
    },
    {
      name: "Conditioning",
      description: "Energy systems and durability for fighters.",
      lessons: [
        { title: "Airdyne Intervals", visibility: "subscribers",
          description: "Short burst intervals to mimic scramble demands.",
          media: [{ kind: "video", url: "https://www.youtube.com/watch?v=3AtDnEC4zak" }] },
        { title: "Grappling Rounds Conditioning", visibility: "subscribers",
          description: "Positional sparring rounds to build specific endurance.",
          media: [{ kind: "video", url: "https://www.youtube.com/watch?v=fLexgOxsZu0" }, { kind: "image" }] },
        { title: "Neck and Grip Strength", visibility: "free",
          description: "Simple weekly circuits to bulletproof neck and grips.",
          media: [{ kind: "video", url: "https://www.youtube.com/watch?v=kXYiU_JCYtU" }] },
        { title: "Breathing Under Fire", visibility: "restricted",
          description: "Breathing protocols for scrambles and high output exchanges.",
          media: [{ kind: "video", url: "https://www.youtube.com/watch?v=2vjPBrBU-TM" }] }
      ]
    }
  ]

  lesson_count = 0
  media_count = 0

  categories.each_with_index do |cat, c_idx|
    category = coach.categories.create!(
      name: cat[:name],
      description: cat[:description],
      position: c_idx
    )

    cat[:lessons].each_with_index do |lesson_attrs, l_idx|
      created_at = rand(1..60).days.ago
      lesson = coach.lessons.new(
        title: lesson_attrs[:title],
        description: lesson_attrs[:description],
        visibility: lesson_attrs[:visibility],
        preview_text: lesson_attrs[:preview_text],
        created_at: created_at,
        updated_at: created_at
      )

      lesson_attrs[:media].each_with_index do |media_attr, m_idx|
        media = lesson.lesson_media.build(
          kind: media_attr[:kind],
          video_url: media_attr[:kind] == "video" ? media_attr[:url] : nil,
          position: m_idx
        )
        if media.image? && icon_path.exist?
          media.image_file.attach(
            io: File.open(icon_path),
            filename: "placeholder.png",
            content_type: "image/png"
          )
        end
      end

      lesson.save!
      lesson_count += 1
      media_count += lesson.lesson_media.count
      CategoryLesson.create!(category: category, lesson: lesson, position: l_idx)
    end
  end

  puts "Seeded demo vault for #{coach.email}: #{categories.size} categories, #{lesson_count} lessons, #{media_count} media items."
end

seed_coach_vault(coach1)

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
