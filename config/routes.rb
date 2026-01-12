Rails.application.routes.draw do
  # Define your application routes per the DSL in https://guides.rubyonrails.org/routing.html

  # Reveal health status on /up that returns 200 if the app boots with no exceptions, otherwise 500.
  # Can be used by load balancers and uptime monitors to verify that the app is live.
  get "up" => "rails/health#show", as: :rails_health_check

  # Render dynamic PWA files from app/views/pwa/* (remember to link manifest in application.html.erb)
  # get "manifest" => "rails/pwa#manifest", as: :pwa_manifest
  # get "service-worker" => "rails/pwa#service_worker", as: :pwa_service_worker

  # Defines the root path route ("/")
  root "dashboard#index"
  get "/dashboard", to: "dashboard#index", as: :dashboard

  get "/login", to: "sessions#new"
  post "/login", to: "sessions#create"
  delete "/logout", to: "sessions#destroy"
  get "/signup", to: "registrations#new", as: :signup
  post "/signup", to: "registrations#create"

  get "/verify-email", to: "email_verifications#show", as: :verify_email
  get "/verify-email/pending", to: "email_verifications#pending", as: :verify_email_pending
  post "/verify-email/resend", to: "email_verifications#resend", as: :resend_verification_email
  get "/password/forgot", to: "password_resets#new", as: :forgot_password
  post "/password/forgot", to: "password_resets#create"
  get "/password/reset/pending", to: "password_resets#pending", as: :password_reset_pending
  post "/password/reset/resend", to: "password_resets#resend", as: :resend_password_reset
  get "/password/reset", to: "password_resets#edit", as: :password_reset
  patch "/password/reset", to: "password_resets#update"
  get "/coach/profile/edit", to: "coach_profiles#edit", as: :edit_my_coach_profile
  patch "/coach/profile", to: "coach_profiles#update", as: :my_coach_profile
  get "/student/profile/edit", to: "student_profiles#edit", as: :edit_my_student_profile
  patch "/student/profile", to: "student_profiles#update", as: :my_student_profile

  if Rails.env.development?
    mount LetterOpenerWeb::Engine, at: "/letter_opener"
  end

  get "/coaches/:slug/lessons", to: "lessons#index", as: :public_coach_lessons
  get "/coaches/:slug/lessons/:lesson_slug", to: "lessons#show", as: :public_coach_lesson
  get "/coaches/:slug/vault", to: "coaches/vaults#show", as: :coach_public_vault

  resources :coaches, only: %i[index show], param: :slug
  resources :lessons, only: %i[index show]

  namespace :coach do
    get "content", to: "content#index", as: :content
    resources :lessons do
      member do
        get :access, to: "lesson_access#edit"
        patch :access, to: "lesson_access#update"
      end
    end
  end

  post "/coaches/:coach_id/subscription", to: "subscriptions#create", as: :coach_subscription
  delete "/coaches/:coach_id/subscription", to: "subscriptions#destroy", as: :cancel_coach_subscription
  get "/subscriptions", to: "subscriptions#index", as: :subscriptions

  post "/lessons/:lesson_id/favorite", to: "favorites#create", as: :favorite_lesson
  delete "/lessons/:lesson_id/favorite", to: "favorites#destroy", as: :unfavorite_lesson
  get "/favorites", to: "favorites#index"

  get "/search", to: "search#index", as: :search

  resources :lessons, only: [] do
    resources :comments, only: [:create]
  end

  resources :conversations, only: [:index, :show, :create, :destroy] do
    resources :messages, only: [:create]
    collection do
      post :mark_all_read
    end
  end

  namespace :coach do
    get "vault", to: "vault#index", as: :vault
    resources :categories, only: [:create, :update, :destroy] do
      resources :lessons, only: [:create], controller: "category_lessons"
      delete "lessons/:lesson_id", to: "category_lessons#destroy", as: :remove_lesson
    end
  end

  get "/vault", to: "vault#index", as: :public_vault

  get "/subscribers", to: "subscribers#index", as: :subscribers
  post "/subscribers/bulk_message", to: "subscribers#bulk_message", as: :bulk_message_subscribers

get "/notifications", to: "notifications#index", as: :notifications
get "/notifications/:id", to: "notifications#show", as: :notification
delete "/notifications/:id", to: "notifications#destroy", as: :delete_notification
post "/notifications/mark_all_read", to: "notifications#mark_all_read", as: :mark_all_notifications_read
end
