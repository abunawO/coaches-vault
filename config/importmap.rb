# Pin npm packages by running ./bin/importmap

pin "application"
pin "@hotwired/turbo-rails", to: "turbo.min.js"
pin "@hotwired/stimulus", to: "stimulus.min.js"
pin "@hotwired/stimulus-loading", to: "stimulus-loading.js"
pin "@rails/activestorage", to: "activestorage.esm.js"
pin_all_from "app/javascript/controllers", under: "controllers"
pin "lessons_filter"
pin "controllers/subscribers_controller", to: "controllers/subscribers_controller.js"
pin "@uppy/core", to: "https://ga.jspm.io/npm:@uppy/core@3.9.1/lib/index.js"
pin "@uppy/aws-s3-multipart", to: "https://ga.jspm.io/npm:@uppy/aws-s3-multipart@3.6.2/lib/index.js"
pin "video_multipart_uploader", to: "video_multipart_uploader.js"
