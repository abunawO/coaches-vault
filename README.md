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
- Uppy (multipart S3 uploads for lesson video files, bundled locally)

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

### JS build (Uppy multipart bundle)
- Video multipart uploads use a local bundled Uppy module (`uppy_bundle`) loaded via importmap.
- Install JS deps: `yarn install`
- Build the bundle (required after changes to `app/javascript/uppy_bundle.js`):
  - `yarn build:uppy`
- Output is written to `app/assets/builds/uppy_bundle.js`

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

## Video Uploads (Current Setup)
Lesson carousel video files use browser-to-S3 multipart upload (Uppy) instead of uploading the raw file through the Rails lesson form.

### Why this exists
- Large video files sent through `POST/PATCH /coach/lessons` caused long requests and nginx 400 failures in production.
- The current flow uploads video chunks directly to S3 first, then submits only an ActiveStorage `signed_id` in the lesson form.

### Frontend flow
- File inputs marked with `data-video-multipart-upload="true"` are handled by `app/javascript/video_multipart_uploader.js`.
- Uppy is loaded from the local importmap-pinned bundle (`app/javascript/uppy_bundle.js` -> `app/assets/builds/uppy_bundle.js`).
- Multipart requests hit Rails endpoints to manage upload state:
  - `POST /s3/multipart/create`
  - `POST /s3/multipart/sign_part`
  - `POST /s3/multipart/complete`
  - `POST /s3/multipart/abort`
- After upload completes, the frontend stores the returned `signed_id` in a hidden input and submits that value with the lesson form.

### Important form behavior (raw file prevention)
- Once multipart upload is active for a video input, the file input `name` is removed so the browser does not include the raw file in `multipart/form-data` for lesson save.
- The visible file input remains usable for UX (reselect/retry), but only the hidden signed blob field is submitted.
- Lesson save buttons are disabled while a multipart video upload is pending and re-enabled after upload completes.

### Backend pieces
- `app/controllers/s3/multipart_uploads_controller.rb`
  - creates multipart uploads
  - presigns part URLs
  - completes multipart upload and creates the `ActiveStorage::Blob`
  - aborts multipart upload on failure/cancel
- `app/services/s3_multipart_service.rb`
  - wraps AWS S3 multipart APIs (`create_multipart_upload`, `upload_part` presign, `complete`, `abort`, `head_object`)
  - handles S3 region/bucket lookup via ActiveStorage service config

### ActiveStorage note (Rails 8.1)
- Rails 8.1 validates blob checksum presence unless blob metadata marks it as `composed`.
- Current multipart completion creates blobs with `metadata: { composed: true }` because this flow does not currently compute a full-file checksum client-side.

### Debugging tips
- Browser DevTools Network should show multipart flow requests (`create`, `sign_part`, `complete`) before lesson save.
- Lesson save (`/coach/lessons` or `/coach/lessons/:id`) should be small/fast and should not upload the raw video file body.
- If multipart upload fails, check:
  - browser console (Uppy/client errors)
  - Rails logs for `/s3/multipart/*`
  - S3/network issues (connection resets on direct S3 `PUT`s can cause retries/aborts)

## Project Status
MVP in active development, focused on clarity, structure, and usability.

### Future Ideas
- Comments
- Tags
- Analytics for coaches
- Payments (Stripe)
- Mobile-friendly UI
