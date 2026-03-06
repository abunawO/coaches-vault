function lessonMediaRowTemplate(kind, index) {
  const positionField = `<input type="hidden" name="lesson[lesson_media_attributes][${index}][position]" class="position-field" value="0" />`

  if (kind === "image") {
    return `
      <div class="slide-card" data-slide-row>
        <div class="slide-thumb">
          <div class="thumb-video">Image</div>
        </div>
        <div class="slide-body">
          <div class="slide-badge">
            <span class="pill-soft">Image slide</span>
          </div>
          <div class="slide-fields">
            <input type="hidden" name="lesson[lesson_media_attributes][${index}][kind]" value="image" />
            ${positionField}
            <label class="muted small-text">Image file</label>
            <input type="file" name="lesson[lesson_media_attributes][${index}][image_file]" class="input" />
          </div>
        </div>
        <div class="slide-controls">
          <button type="button" class="icon-btn" data-move="up" aria-label="Move up">↑</button>
          <button type="button" class="icon-btn" data-move="down" aria-label="Move down">↓</button>
          <button type="button" class="icon-btn icon-btn--danger" data-remove-row aria-label="Remove slide">🗑</button>
          <input type="checkbox" name="lesson[lesson_media_attributes][${index}][_destroy]" style="display:none;" data-destroy-field="true" />
        </div>
      </div>
    `
  }

  return `
    <div class="slide-card" data-slide-row>
      <div class="slide-thumb">
        <div class="thumb-video">Video</div>
      </div>
      <div class="slide-body">
        <div class="slide-badge">
          <span class="pill-soft">Video slide</span>
        </div>
        <div class="slide-fields">
          <input type="hidden" name="lesson[lesson_media_attributes][${index}][kind]" value="video" />
          ${positionField}
          <label class="muted small-text">Video URL</label>
          <input type="text" name="lesson[lesson_media_attributes][${index}][video_url]" class="input" placeholder="https://www.youtube.com/watch?v=..." />
          <label class="muted small-text" style="margin-top:8px;">Or upload video</label>
          <input type="file" name="lesson[lesson_media_attributes][${index}][video_file]" class="input" accept="video/mp4,video/quicktime" data-video-multipart-upload="true" />
          <div class="muted small-text upload-status" data-upload-status></div>
          <p class="muted small-text">Use a YouTube/Vimeo URL OR upload an MP4/MOV file.</p>
        </div>
      </div>
      <div class="slide-controls">
        <button type="button" class="icon-btn" data-move="up" aria-label="Move up">↑</button>
        <button type="button" class="icon-btn" data-move="down" aria-label="Move down">↓</button>
        <button type="button" class="icon-btn icon-btn--danger" data-remove-row aria-label="Remove slide">🗑</button>
        <input type="checkbox" name="lesson[lesson_media_attributes][${index}][_destroy]" style="display:none;" data-destroy-field="true" />
      </div>
    </div>
  `
}

export function createLessonMediaRow({ index, kind, initialData = {} }) {
  void initialData
  const template = document.createElement("template")
  template.innerHTML = lessonMediaRowTemplate(kind, index).trim()
  return template.content.firstElementChild
}
