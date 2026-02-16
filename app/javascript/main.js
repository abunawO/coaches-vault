// Configure your import map in config/importmap.rb. Read more: https://github.com/rails/importmap-rails
import "@hotwired/turbo-rails"
import "controllers"
import "lessons_filter"
import * as ActiveStorage from "@rails/activestorage"
import { initVideoMultipartUploads } from "video_multipart_uploader"

ActiveStorage.start()

const bootUploads = () => {
  try {
    initVideoMultipartUploads()
  } catch (error) {
    console.warn("Video multipart init failed; continuing without it.", error)
  }
}

document.addEventListener("turbo:load", bootUploads)
document.addEventListener("turbo:render", bootUploads)
