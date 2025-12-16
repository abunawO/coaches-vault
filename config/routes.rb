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

  get "/login", to: "sessions#new"
  post "/login", to: "sessions#create"
  delete "/logout", to: "sessions#destroy"

  get "/coaches/:slug/lessons", to: "lessons#index", as: :public_coach_lessons
  get "/coaches/:slug/lessons/:lesson_slug", to: "lessons#show", as: :public_coach_lesson

  resources :coaches, only: %i[index show], param: :slug
  resources :lessons, only: %i[index show]

  namespace :coach do
    resources :lessons
  end

  post "/coaches/:coach_id/subscription", to: "subscriptions#create", as: :coach_subscription
  delete "/coaches/:coach_id/subscription", to: "subscriptions#destroy", as: :cancel_coach_subscription
  get "/subscriptions", to: "subscriptions#index", as: :subscriptions

  post "/lessons/:lesson_id/favorite", to: "favorites#create", as: :favorite_lesson
  delete "/lessons/:lesson_id/favorite", to: "favorites#destroy", as: :unfavorite_lesson
  get "/favorites", to: "favorites#index"

  get "/search", to: "search#index", as: :search
end
