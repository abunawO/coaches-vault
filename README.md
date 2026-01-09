# MyVault (Coaches Vault)

A subscription-based platform where coaches host private lesson vaults and students subscribe to access structured, searchable content without social media noise.

## Core Concepts
- **Roles:** Coaches create/manage lessons; students subscribe and favorite lessons.
- **Vaults:** Each coach has a public-facing profile and a private lesson vault.
- **Access:** Lessons unlock for subscribed students (multiple coach subscriptions supported); MVP uses YouTube/Vimeo embeds for video content.

## Features
- Authentication (email/password) with role-based access (coach vs student)
- Coach profiles (public)
- Lesson management (CRUD for coaches)
- Subscriptions (students ↔ coaches)
- Favorites (students → lessons)
- Search (coaches + lessons)
- Public browsing for guests (read-only lists and profiles)

## Tech Stack
- Ruby, Ruby on Rails 8
- SQLite (development)
- ERB views, minimal JS (Rails defaults), no frontend framework

## Setup
1. Clone the repo.
2. Ruby 3.x recommended.
3. Install gems: `bundle install`
4. Database setup:
   - `rails db:create`
   - `rails db:migrate`
   - `rails db:seed`
5. Start the app: `bin/dev` (or `rails server`)
6. Visit: `http://localhost:3000`

### Image processing (libvips)
- We use ActiveStorage variants with vips. Install libvips locally:
  - macOS: `brew install vips`
  - Debian/Ubuntu: `sudo apt-get update && sudo apt-get install -y libvips`
  - Alpine: `apk add vips`

## Seeded Accounts
- Coach: `coach@test.com` (role: coach)
- Student: `student@test.com` (role: student)
- Passwords are defined in `db/seeds.rb`.

## App Navigation
- `/coaches` — browse coaches
- `/coaches/:slug` — public coach page
- `/lessons` — role-based lesson view (coaches see their lessons; students/guests see public list)
- `/dashboard` — role-specific dashboard
- `/search` — search lessons & coaches
- `/favorites` — student favorites
- `/subscriptions` — manage student subscriptions

## Role-Based Behavior
- **Coach:** Manage own lessons (create/edit/delete), see only own lessons on dashboard and /lessons, public coach page for their vault.
- **Student:** Browse coaches, subscribe, view unlocked lessons, favorite lessons, manage subscriptions/favorites.
- **Guest:** Browse public coaches and lesson lists; must log in to subscribe or access locked content.

## Project Status
MVP in active development, focused on clarity, structure, and usability.

### Future Ideas
- Comments
- Tags
- Analytics for coaches
- Payments (Stripe)
- Mobile-friendly UI
