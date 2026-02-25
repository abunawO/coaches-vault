# Pin npm packages by running ./bin/importmap

pin "application"
pin "@hotwired/turbo-rails", to: "turbo.min.js"
pin "@hotwired/stimulus", to: "stimulus.min.js"
pin "@hotwired/stimulus-loading", to: "stimulus-loading.js"
pin "@rails/activestorage", to: "activestorage.esm.js"
pin_all_from "app/javascript/controllers", under: "controllers"
pin "lessons_filter"
pin "controllers/subscribers_controller", to: "controllers/subscribers_controller.js"
pin "uppy_bundle", to: "uppy_bundle.js"
pin "video_multipart_uploader", to: "video_multipart_uploader.js"
