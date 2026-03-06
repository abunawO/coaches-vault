export class LessonMediaRowAdapter {
  constructor(rowEl) {
    this.rowEl = rowEl
  }

  get fileInput() {
    return this.rowEl?.querySelector("input[type='file']") || null
  }

  get imageFileInput() {
    return this.rowEl?.querySelector("input[type='file']:not([data-video-multipart-upload='true'])") || null
  }

  get videoFileInput() {
    return this.rowEl?.querySelector("[data-video-multipart-upload='true']") || null
  }

  get videoUrlInput() {
    return this.rowEl?.querySelector("input[type='text']") || null
  }

  get destroyField() {
    return this.rowEl?.querySelector("[data-destroy-field]") || null
  }

  get statusEl() {
    return this.rowEl?.querySelector("[data-upload-status]") || null
  }

  get thumbEl() {
    return this.rowEl?.querySelector(".slide-thumb") || null
  }

  get previewEl() {
    return this.thumbEl?.querySelector("img, video") || null
  }

  get fieldsEl() {
    return this.rowEl?.querySelector(".slide-fields") || null
  }

  get positionField() {
    return this.rowEl?.querySelector(".position-field") || null
  }

  get moveUpButton() {
    return this.rowEl?.querySelector("[data-move='up']") || null
  }

  get moveDownButton() {
    return this.rowEl?.querySelector("[data-move='down']") || null
  }

  get removeButton() {
    return this.rowEl?.querySelector("[data-remove-row]") || null
  }

  setStatus(text) {
    if (!this.statusEl) return
    this.statusEl.textContent = text || ""
  }

  setThumbUrl(url) {
    const preview = this.previewEl
    if (!preview || typeof preview.src === "undefined") return
    preview.src = url || ""
  }

  setPreviewVisible(bool) {
    if (!this.previewEl) return
    this.previewEl.hidden = !bool
  }
}
