import { Controller } from "@hotwired/stimulus"
import { createLessonMediaRow } from "services/lesson_media_row_factory"
import { LessonMediaBulkCoordinator } from "services/lesson_media_bulk_coordinator"
import { LessonMediaRowAdapter } from "adapters/lesson_media_row_adapter"

export default class extends Controller {
  connect() {
    if (!this.element) return
    if (this.element.dataset.lessonFormInitialized === "true") return
    this.element.dataset.lessonFormInitialized = "true"
    this.debug("connected", { path: window.location.pathname })

    this.form = this.element
    this.cleanups = []
    this.MAX_SLIDES = 10
    this.draftKind = null
    this.bulkFeedbackTimer = null
    this.nestedIndex = Number(this.element.dataset.lessonFormNestedIndex || Date.now())
    this.objectUrls = new Map()
    this.bulkRemainingSlots = 0
    this.draftSaveTimer = null
    this.isApplyingDraft = false
    this.hasRestoredDraft = false
    this.storage = this.resolveDraftStorage()
    this.draftSchemaVersion = this.element.dataset.lessonFormDraftVersion || "1"
    this.baseDraftKey = this.element.dataset.lessonFormDraftKey || null
    this.draftScope = this.element.dataset.lessonFormDraftScope || null
    this.draftKey = this.resolveDraftKey()
    this.bulkCoordinator = new LessonMediaBulkCoordinator({
      appendRowForKind: (kind) => this.appendRowForBulk(kind),
      assignFileToRow: (row, kind, file) => this.assignBulkFileToRow(row, kind, file),
      triggerVideoUploadIfBound: (input) => this.triggerVideoUploadIfBound(input)
    })

    this.cacheElements()
    this.visibilityRadios ||= []
    this.rows ||= []
    this.addButtons ||= []
    this.bindVisibilitySection()
    this.bindDirtyTracking()
    this.bindSlideSection()
    this.bindCoverImagePreview()
    this.bindDraftRecoveryUi()
    this.on(this.form, "video-multipart:state-change", (event) => {
      const state = event?.detail?.state
      if (state === "complete" || state === "failed" || state === "idle") {
        this.persistDraftSoon()
      }
    })
    this.restoreDraftIfPresent()
    this.on(this.form, "submit", () => this.revokeAllObjectUrls())
    this.on(this.form, "turbo:submit-end", (event) => {
      if (event?.detail?.success) this.clearDraft()
    })

    this.toggleVisibility()
    this.togglePreviewVisibility()
    this.togglePreviewText()
    this.updateCount()
    this.reindexPositions()
    this.updateSlideLimitState()
    this.markDirty()
    this.initMultipart(this.form)
    this.persistDraftSoon()
  }

  disconnect() {
    this.revokeAllObjectUrls()
    this.revokeCoverPreviewObjectUrl()
    if (this.element?.dataset) {
      delete this.element.dataset.lessonFormInitialized
      this.element.dataset.lessonFormNestedIndex = String(this.nestedIndex || Date.now())
    }
    this.cleanups.forEach((fn) => fn())
    this.cleanups = []
    if (this.bulkFeedbackTimer) {
      clearTimeout(this.bulkFeedbackTimer)
      this.bulkFeedbackTimer = null
    }
    if (this.draftSaveTimer) {
      clearTimeout(this.draftSaveTimer)
      this.draftSaveTimer = null
    }
  }

  cacheElements() {
    if (!this.form?.querySelector) {
      this.visibilityRadios = []
      this.rows = []
      this.addButtons = []
      return
    }

    const q = (selector) => this.form.querySelector(selector)
    const qa = (selector) => Array.from(this.form.querySelectorAll(selector))

    this.visibilityRadios = qa("input[name='lesson[visibility]']")
    this.previewWrap = q("#preview-fields")
    this.previewCheckbox = q("input[name='lesson[preview]']")
    this.previewTextRow = q("#preview-text-row")
    this.privateNote = q("#private-note-new")
    this.selectedWrapper = q("#selected-wrapper-new")
    this.disabledOverlay = q("#access-disabled-overlay-new")
    this.search = q("#subscriber-search-new")
    this.rows = qa(".subscriber-access-new")
    this.selectAllBtn = q("#select-all-btn-new")
    this.clearAllBtn = q("#clear-all-btn-new")
    this.selectedCount = q("#selected-count-new")
    this.dirtyIndicator = q("#dirty-indicator-new")

    this.mediaList = q("#lesson-media-list")
    this.addButtons = qa("[data-add-media]")
    this.bulkAddButton = q("[data-bulk-add-button]")
    this.bulkFileInput = q("[data-bulk-file-input]")
    this.bulkDropzone = q("[data-bulk-dropzone]")
    this.bulkFeedback = q("[data-bulk-feedback]")
    this.bulkUsage = q("[data-bulk-usage]")
    this.slideLimitMessage = q("#slide-limit-message")

    this.draft = q("#draft-slide")
    this.draftImageWrap = q("#draft-image")
    this.draftVideoWrap = q("#draft-video")
    this.draftImageInput = q("#draft-image-input")
    this.draftVideoInput = q("#draft-video-input")
    this.draftVideoFileInput = q("#draft-video-file-input")
    this.draftClose = q("#draft-close")
    this.draftCancel = q("#draft-cancel")
    this.draftAdd = q("#draft-add")
    this.draftBanner = q("#lesson-draft-banner")
    this.draftBannerMessage = q("#lesson-draft-message")
    this.discardDraftBtn = q("#lesson-draft-discard")
    this.coverImageInput = q("[data-cover-image-input]")
    this.coverImagePreviewImage = q("[data-cover-image-preview-image]")
    this.coverImagePreviewFilename = q("[data-cover-image-preview-filename]")
    this.coverImagePreviewEmpty = q("[data-cover-image-preview-empty]")
    this.removeCoverImageInput = q("[data-remove-cover-image-input]")
  }

  on(element, eventName, handler, options) {
    if (!element) return
    element.addEventListener(eventName, handler, options)
    this.cleanups.push(() => element.removeEventListener(eventName, handler, options))
  }

  debugEnabled() {
    try {
      return new URLSearchParams(window.location.search).get("debug_lesson_form") === "1"
    } catch (_e) {
      return false
    }
  }

  debug(...args) {
    if (!this.debugEnabled()) return
    console.debug("[lesson-form]", ...args)
  }

  formatBytes(bytes) {
    const value = Number(bytes || 0)
    if (!value) return "0 B"
    const units = ["B", "KB", "MB", "GB"]
    let size = value
    let unitIdx = 0
    while (size >= 1024 && unitIdx < units.length - 1) {
      size /= 1024
      unitIdx += 1
    }
    const precision = unitIdx === 0 ? 0 : 1
    return `${size.toFixed(precision)} ${units[unitIdx]}`
  }

  bindCoverImagePreview() {
    if (!this.coverImageInput || !this.coverImagePreviewImage) return
    this.on(this.coverImageInput, "change", () => this.updateCoverImagePreviewFromInput())
    this.on(this.removeCoverImageInput, "change", () => this.updateCoverImagePreviewForRemoval())
  }

  updateCoverImagePreviewFromInput() {
    if (!this.coverImageInput || !this.coverImagePreviewImage) return
    const file = this.coverImageInput.files?.[0]
    if (!file) {
      this.restorePersistedCoverPreview()
      return
    }

    this.revokeCoverPreviewObjectUrl()
    const url = URL.createObjectURL(file)
    this.coverPreviewObjectUrl = url
    this.coverImagePreviewImage.src = url
    this.coverImagePreviewImage.hidden = false
    if (this.coverImagePreviewFilename) {
      this.coverImagePreviewFilename.hidden = false
      this.coverImagePreviewFilename.textContent = `Selected: ${file.name}`
    }
    if (this.coverImagePreviewEmpty) this.coverImagePreviewEmpty.hidden = true
    if (this.removeCoverImageInput) this.removeCoverImageInput.checked = false
  }

  updateCoverImagePreviewForRemoval() {
    if (!this.removeCoverImageInput) return
    if (this.removeCoverImageInput.checked) {
      if (this.coverImageInput && (this.coverImageInput.files?.length || 0) > 0) return
      this.revokeCoverPreviewObjectUrl()
      if (this.coverImagePreviewImage) this.coverImagePreviewImage.hidden = true
      if (this.coverImagePreviewFilename) this.coverImagePreviewFilename.hidden = true
      if (this.coverImagePreviewEmpty) {
        this.coverImagePreviewEmpty.hidden = false
        this.coverImagePreviewEmpty.textContent = "Cover image will be removed when you save."
      }
      return
    }
    this.restorePersistedCoverPreview()
  }

  restorePersistedCoverPreview() {
    if (!this.coverImagePreviewImage) return
    this.revokeCoverPreviewObjectUrl()
    const persisted = this.coverImagePreviewImage.dataset.persisted === "true"
    if (persisted && this.coverImagePreviewImage.getAttribute("src")) {
      this.coverImagePreviewImage.hidden = false
      if (this.coverImagePreviewFilename) {
        this.coverImagePreviewFilename.hidden = false
        this.coverImagePreviewFilename.textContent = "Current cover image"
      }
      if (this.coverImagePreviewEmpty) this.coverImagePreviewEmpty.hidden = true
      return
    }

    this.coverImagePreviewImage.hidden = true
    if (this.coverImagePreviewFilename) this.coverImagePreviewFilename.hidden = true
    if (this.coverImagePreviewEmpty) {
      this.coverImagePreviewEmpty.hidden = false
      this.coverImagePreviewEmpty.textContent = "No cover image selected yet."
    }
  }

  revokeCoverPreviewObjectUrl() {
    if (!this.coverPreviewObjectUrl) return
    try {
      URL.revokeObjectURL(this.coverPreviewObjectUrl)
    } catch (_e) {}
    this.coverPreviewObjectUrl = null
  }

  setThumbToImage(row, file) {
    if (!row || !file) return
    const adapter = new LessonMediaRowAdapter(row)
    const thumb = adapter.thumbEl
    if (!thumb) return
    this.revokeRowObjectUrl(row, "imageUrl")
    const url = URL.createObjectURL(file)
    this.storeRowObjectUrl(row, "imageUrl", url)
    thumb.innerHTML = ""
    const img = document.createElement("img")
    img.src = url
    img.alt = file.name || "Selected image"
    thumb.appendChild(img)
  }

  setThumbToVideo(row, file) {
    if (!row || !file) return
    const adapter = new LessonMediaRowAdapter(row)
    const thumb = adapter.thumbEl
    if (!thumb) return
    this.revokeRowObjectUrl(row, "videoUrl")
    const url = URL.createObjectURL(file)
    this.storeRowObjectUrl(row, "videoUrl", url)
    thumb.innerHTML = ""
    const video = document.createElement("video")
    video.src = url
    video.muted = true
    video.controls = true
    video.playsInline = true
    video.preload = "metadata"
    video.setAttribute("aria-label", file.name || "Selected video preview")
    thumb.appendChild(video)
  }

  setInlineMeta(row, file) {
    if (!row || !file) return
    const adapter = new LessonMediaRowAdapter(row)
    const fields = adapter.fieldsEl
    if (!fields) return
    let meta = fields.querySelector("[data-local-file-meta]")
    if (!meta) {
      meta = document.createElement("div")
      meta.dataset.localFileMeta = "true"
      meta.className = "thumb-meta"
      const status = fields.querySelector("[data-upload-status]")
      if (status) {
        fields.insertBefore(meta, status)
      } else {
        fields.appendChild(meta)
      }
    }
    meta.textContent = `${file.name} (${this.formatBytes(file.size)})`
    meta.title = file.name
  }

  clearInlineMeta(row) {
    const adapter = new LessonMediaRowAdapter(row)
    const fields = adapter.fieldsEl
    const meta = fields?.querySelector("[data-local-file-meta]")
    if (meta) meta.remove()
  }

  storeRowObjectUrl(row, key, url) {
    const existing = this.objectUrls.get(row) || {}
    this.revokeRowObjectUrl(row, key)
    existing[key] = url
    this.objectUrls.set(row, existing)
  }

  revokeRowObjectUrl(row, key) {
    const urls = this.objectUrls.get(row)
    if (!urls || !urls[key]) return
    try {
      URL.revokeObjectURL(urls[key])
    } catch (_e) {}
    delete urls[key]
    if (!urls.imageUrl && !urls.videoUrl) this.objectUrls.delete(row)
    else this.objectUrls.set(row, urls)
  }

  revokeRowObjectUrls(row) {
    if (!row) return
    const urls = this.objectUrls.get(row)
    if (!urls) return
    ;["imageUrl", "videoUrl"].forEach((key) => {
      if (!urls[key]) return
      try {
        URL.revokeObjectURL(urls[key])
      } catch (_e) {}
    })
    this.objectUrls.delete(row)
  }

  revokeAllObjectUrls() {
    Array.from(this.objectUrls.keys()).forEach((row) => this.revokeRowObjectUrls(row))
  }

  bindVisibilitySection() {
    ;(this.visibilityRadios || []).forEach((radio) => {
      this.on(radio, "change", () => {
        this.toggleVisibility()
        this.togglePreviewVisibility()
        this.markDirty()
        this.persistDraftSoon()
      })
    })

    this.on(this.previewCheckbox, "change", () => {
      this.togglePreviewText()
      this.markDirty()
      this.persistDraftSoon()
    })

    this.on(this.search, "input", (event) => {
      const q = event.target.value.toLowerCase()
      ;(this.rows || []).forEach((row) => {
        const email = row.dataset.email || ""
        row.style.display = email.includes(q) ? "" : "none"
      })
    })

    ;(this.rows || []).forEach((row) => {
      const cb = row.querySelector("input[type='checkbox']")
      this.on(cb, "change", () => {
        this.updateCount()
        this.markDirty()
        this.persistDraftSoon()
      })
    })

    this.on(this.selectAllBtn, "click", () => {
      ;(this.rows || []).forEach((row) => {
        const cb = row.querySelector("input[type='checkbox']")
        if (cb && !cb.disabled) cb.checked = true
      })
      this.updateCount()
      this.markDirty()
      this.persistDraftSoon()
    })

    this.on(this.clearAllBtn, "click", () => {
      ;(this.rows || []).forEach((row) => {
        const cb = row.querySelector("input[type='checkbox']")
        if (cb && !cb.disabled) cb.checked = false
      })
      this.updateCount()
      this.markDirty()
      this.persistDraftSoon()
    })
  }

  bindDirtyTracking() {
    this.initialSnapshot = this.form ? new FormData(this.form) : null
    this.on(this.form, "change", () => {
      this.markDirty()
      this.persistDraftSoon()
    })
    this.on(this.form, "input", () => this.persistDraftSoon())
  }

  bindSlideSection() {
    if (!this.mediaList) return
    Array.from(this.mediaList?.querySelectorAll("[data-slide-row]") || []).forEach((row) => this.attachRowHandlers(row))

    ;(this.addButtons || []).forEach((btn) => {
      this.on(btn, "click", () => {
        if (this.currentSlidesCount() >= this.MAX_SLIDES) {
          this.updateSlideLimitState()
          return
        }
        this.openDraft(btn.dataset.addMedia)
      })
    })

    this.on(this.draftClose, "click", () => this.closeDraft())
    this.on(this.draftCancel, "click", () => this.closeDraft())
    this.on(this.draftAdd, "click", () => this.handleDraftAdd())

    this.handleEsc = (event) => {
      if (event.key === "Escape" && this.draft && !this.draft.hidden) this.closeDraft()
    }
    this.on(document, "keydown", this.handleEsc)

    this.on(this.bulkAddButton, "click", () => this.bulkFileInput?.click())
    this.on(this.bulkDropzone, "click", () => this.bulkFileInput?.click())

    this.on(this.bulkDropzone, "dragover", (event) => {
      event.preventDefault()
      this.bulkDropzone.classList.add("is-dragover")
    })

    this.on(this.bulkDropzone, "dragleave", (event) => {
      if (!this.bulkDropzone) return
      if (event.target === this.bulkDropzone) this.bulkDropzone.classList.remove("is-dragover")
    })

    this.on(this.bulkDropzone, "drop", async (event) => {
      event.preventDefault()
      this.bulkDropzone?.classList.remove("is-dragover")
      const files = event.dataTransfer?.files
      await this.handleBulkFiles(files)
    })

    this.on(this.bulkFileInput, "change", async (event) => {
      const files = event.target.files
      await this.handleBulkFiles(files)
      // allow re-selecting the same file(s)
      event.target.value = ""
    })
  }

  togglePreviewVisibility() {
    if (!this.previewWrap) return
    const val = this.form.querySelector("input[name='lesson[visibility]']:checked")?.value
    this.previewWrap.style.display = val === "subscribers" ? "" : "none"
  }

  togglePreviewText() {
    if (!this.previewTextRow) return
    this.previewTextRow.style.display = this.previewCheckbox?.checked ? "" : "none"
  }

  toggleVisibility() {
    const val = this.form.querySelector("input[name='lesson[visibility]']:checked")?.value
    const isRestricted = val === "restricted"
    if (this.selectedWrapper) this.selectedWrapper.style.display = isRestricted ? "" : "none"
    if (this.disabledOverlay) this.disabledOverlay.style.display = isRestricted ? "none" : ""
    if (this.privateNote) this.privateNote.style.display = isRestricted ? "" : "none"

    const disabled = !isRestricted
    ;(this.rows || []).forEach((row) => {
      const cb = row.querySelector("input[type='checkbox']")
      if (cb) cb.disabled = disabled
      row.classList.toggle("disabled", disabled)
    })

    this.updateCount()
  }

  updateCount() {
    const checked = (this.rows || []).filter((row) => row.querySelector("input[type='checkbox']")?.checked)
    if (this.selectedCount) this.selectedCount.textContent = `${checked.length} selected`
    if (this.clearAllBtn) this.clearAllBtn.style.visibility = checked.length > 0 ? "visible" : "hidden"
  }

  isDirty() {
    if (!this.form || !this.initialSnapshot) return false
    const current = new FormData(this.form)
    const keys = Array.from(new Set([...this.initialSnapshot.keys(), ...current.keys()]))

    for (const key of keys) {
      if (current.getAll(key).sort().join(",") !== this.initialSnapshot.getAll(key).sort().join(",")) return true
    }

    return false
  }

  markDirty() {
    if (!this.dirtyIndicator) return
    this.dirtyIndicator.textContent = this.isDirty() ? "Unsaved changes" : "Changes are saved when you click Save."
  }

  reindexPositions() {
    if (!this.mediaList) return
    const rows = Array.from(this.mediaList.querySelectorAll("[data-slide-row]"))
    rows.forEach((row, idx) => {
      const posField = new LessonMediaRowAdapter(row).positionField
      if (posField) posField.value = idx
    })
  }

  currentSlidesCount() {
    if (!this.mediaList) return 0
    return Array.from(this.mediaList.querySelectorAll("[data-slide-row]")).filter((row) => {
      if (row.classList.contains("is-destroyed")) return false
      const destroyField = new LessonMediaRowAdapter(row).destroyField
      return !(destroyField && destroyField.checked)
    }).length
  }

  updateSlideLimitState() {
    const count = this.currentSlidesCount()
    const limitReached = count >= this.MAX_SLIDES
    ;[...this.addButtons, this.bulkAddButton, this.bulkDropzone].filter(Boolean).forEach((el) => {
      if (el.tagName === "BUTTON") el.disabled = limitReached
      el.classList.toggle("is-disabled", limitReached)
    })

    if (this.slideLimitMessage) {
      this.slideLimitMessage.textContent = limitReached
        ? "Slide limit reached (10). Remove a slide to add another."
        : "You can add up to 10 slides per lesson."
    }

    if (this.bulkUsage) {
      this.bulkUsage.textContent = `${count} / ${this.MAX_SLIDES} slides used`
    }
  }

  attachRowHandlers(row, isNew = false) {
    const adapter = new LessonMediaRowAdapter(row)
    const up = adapter.moveUpButton
    const down = adapter.moveDownButton
    const removeBtn = adapter.removeButton
    const destroyField = adapter.destroyField
    const imageInput = adapter.imageFileInput
    const videoInput = adapter.videoFileInput

    this.on(imageInput, "change", () => {
      const file = imageInput?.files?.[0]
      if (!file) return
      this.setThumbToImage(row, file)
    })

    this.on(videoInput, "change", () => {
      const file = videoInput?.files?.[0]
      if (!file) {
        this.clearInlineMeta(row)
        return
      }
      this.setThumbToVideo(row, file)
      this.setInlineMeta(row, file)
    })

    this.on(up, "click", () => {
      const prev = row.previousElementSibling
      if (prev) {
        this.mediaList.insertBefore(row, prev)
        this.reindexPositions()
        this.markDirty()
        this.persistDraftSoon()
      }
    })

    this.on(down, "click", () => {
      const next = row.nextElementSibling
      if (next) {
        this.mediaList.insertBefore(next, row)
        this.reindexPositions()
        this.markDirty()
        this.persistDraftSoon()
      }
    })

    this.on(removeBtn, "click", () => {
      if (window.clearVideoMultipartUploadForRow) {
        window.clearVideoMultipartUploadForRow(row)
      }
      this.revokeRowObjectUrls(row)
      if (destroyField) {
        destroyField.checked = true
        destroyField.value = "1"
        row.classList.add("is-destroyed")
      } else if (isNew) {
        row.remove()
      } else {
        row.classList.add("is-destroyed")
      }
      this.reindexPositions()
      this.updateSlideLimitState()
      this.markDirty()
      if (window.syncVideoMultipartSubmitState) {
        window.syncVideoMultipartSubmitState(this.form)
      }
      this.persistDraftSoon()
    })
  }

  resetDraft() {
    this.draftKind = null
    if (this.draftImageWrap) this.draftImageWrap.hidden = true
    if (this.draftVideoWrap) this.draftVideoWrap.hidden = true
    if (this.draftImageInput) this.draftImageInput.value = ""
    if (this.draftVideoInput) this.draftVideoInput.value = ""
    if (this.draftVideoFileInput) this.draftVideoFileInput.value = ""
    if (this.draft) this.draft.hidden = true
  }

  closeDraft() {
    this.resetDraft()
  }

  openDraft(kind) {
    this.draftKind = kind
    if (!this.draft) return
    this.draft.hidden = false
    if (this.draftImageWrap) this.draftImageWrap.hidden = kind !== "image"
    if (this.draftVideoWrap) this.draftVideoWrap.hidden = kind !== "video"

    if (kind === "image") {
      if (this.draftVideoInput) this.draftVideoInput.value = ""
      if (this.draftImageInput) {
        this.draftImageInput.value = ""
        this.draftImageInput.focus()
      }
    } else {
      if (this.draftImageInput) this.draftImageInput.value = ""
      if (this.draftVideoInput) {
        this.draftVideoInput.value = ""
        this.draftVideoInput.focus()
      }
      if (this.draftVideoFileInput) this.draftVideoFileInput.value = ""
      this.initMultipart(this.draftVideoWrap || this.form)
    }
  }

  handleDraftAdd() {
    if (!this.draftKind || !this.mediaList) return
    if (this.draftKind === "image" && (!this.draftImageInput || !this.draftImageInput.files.length)) return

    const urlVal = this.draftVideoInput ? this.draftVideoInput.value.trim() : ""
    const hasVideoFile = this.draftVideoFileInput && this.draftVideoFileInput.files.length > 0
    if (this.draftKind === "video" && !hasVideoFile && urlVal === "") return

    if (this.currentSlidesCount() >= this.MAX_SLIDES) {
      this.updateSlideLimitState()
      return
    }

    const index = this.nextNestedIndex()
    const newRow = createLessonMediaRow({ index, kind: this.draftKind, initialData: {} })
    this.mediaList.appendChild(newRow)
    if (!newRow) return
    const newRowAdapter = new LessonMediaRowAdapter(newRow)

    if (this.draftKind === "image") {
      const draftFile = this.draftImageInput?.files?.[0]
      const target = newRowAdapter.imageFileInput
      if (target && this.draftImageInput) {
        this.draftImageInput.name = target.name
        target.replaceWith(this.draftImageInput)

        const fresh = document.createElement("input")
        fresh.type = "file"
        fresh.className = "input"
        fresh.id = "draft-image-input"
        this.draftImageInput = fresh
        this.draftImageWrap?.querySelector("input[type='file']")?.remove()
        this.draftImageWrap?.appendChild(fresh)
      }
      if (draftFile) this.setThumbToImage(newRow, draftFile)
    } else {
      const draftVideoFile = this.draftVideoFileInput?.files?.[0]
      const targetUrl = newRowAdapter.videoUrlInput
      const targetFile = newRowAdapter.videoFileInput

      if (hasVideoFile && targetFile && this.draftVideoFileInput) {
        this.draftVideoFileInput.name = targetFile.name
        targetFile.replaceWith(this.draftVideoFileInput)
        if (targetUrl) targetUrl.value = ""

        const freshVideoFile = document.createElement("input")
        freshVideoFile.type = "file"
        freshVideoFile.className = "input"
        freshVideoFile.id = "draft-video-file-input"
        freshVideoFile.accept = "video/mp4,video/quicktime"
        freshVideoFile.setAttribute("data-video-multipart-upload", "true")
        this.draftVideoFileInput = freshVideoFile
        this.draftVideoWrap?.querySelector("input[type='file']")?.remove()
        this.draftVideoWrap?.appendChild(freshVideoFile)
        this.initMultipart(this.draftVideoWrap || this.form)
      } else if (targetUrl) {
        targetUrl.value = urlVal
      }
      if (draftVideoFile) {
        this.setThumbToVideo(newRow, draftVideoFile)
        this.setInlineMeta(newRow, draftVideoFile)
      }
    }

    this.attachRowHandlers(newRow, true)
    this.initMultipart(newRow)
    this.reindexPositions()
    this.closeDraft()
    this.updateSlideLimitState()
    this.markDirty()
    this.persistDraftSoon()
  }

  async handleBulkFiles(fileList) {
    this.showBulkFeedback("")
    const files = Array.from(fileList || [])
    if (files.length === 0 || !this.mediaList) return

    const remaining = Math.max(this.MAX_SLIDES - this.currentSlidesCount(), 0)
    if (remaining === 0) {
      this.showBulkFeedback("Slide limit reached (10). Remove a slide to add more.")
      this.updateSlideLimitState()
      return
    }

    let processResult = { supportedCount: 0, unsupportedCount: 0, assignmentFailures: 0, addedCount: 0 }
    this.bulkRemainingSlots = remaining
    try {
      processResult = await this.bulkCoordinator.processFiles(files)
    } finally {
      this.bulkRemainingSlots = 0
    }

    this.reindexPositions()
    this.updateSlideLimitState()
    this.markDirty()
    this.persistDraftSoon()

    const overflowCount = Math.max(processResult.supportedCount - remaining, 0)
    const messages = []
    if (processResult.addedCount > 0) messages.push(`Added ${processResult.addedCount} slide${processResult.addedCount === 1 ? "" : "s"}.`)
    if (overflowCount > 0) messages.push(`Only the first ${remaining} file${remaining === 1 ? "" : "s"} were added (max 10 slides).`)
    if (processResult.unsupportedCount > 0) messages.push(`${processResult.unsupportedCount} unsupported file${processResult.unsupportedCount === 1 ? "" : "s"} skipped.`)
    if (processResult.assignmentFailures > 0) messages.push("Your browser requires adding some files one at a time for uploads.")
    this.showBulkFeedback(messages.join(" "))
  }

  appendRowForBulk(kind) {
    if (!this.mediaList || this.bulkRemainingSlots <= 0) return null
    this.bulkRemainingSlots -= 1
    return this.appendRowForKind(kind)
  }

  assignBulkFileToRow(row, kind, file) {
    const rowAdapter = new LessonMediaRowAdapter(row)
    const assigned = this.assignFileToRow(row, kind, file, rowAdapter)
    if (!assigned) return false

    if (kind === "image") {
      this.setThumbToImage(row, file)
    } else {
      this.setThumbToVideo(row, file)
      this.setInlineMeta(row, file)
    }

    this.attachRowHandlers(row, true)
    this.initMultipart(row)
    this.debug("bulk: initMultipart called", { kind })
    return true
  }

  appendRowForKind(kind, initialData = {}) {
    if (!this.mediaList) return null
    const index = this.nextNestedIndex()
    const row = createLessonMediaRow({ index, kind, initialData })
    if (!row) return null
    this.mediaList.appendChild(row)
    return row
  }

  nextNestedIndex() {
    this.nestedIndex = Number(this.nestedIndex || Date.now())
    this.nestedIndex += 1
    if (this.element?.dataset) this.element.dataset.lessonFormNestedIndex = String(this.nestedIndex)
    return this.nestedIndex
  }

  assignFileToRow(row, kind, file, adapter = null) {
    if (!row || !file) return false
    const rowAdapter = adapter || new LessonMediaRowAdapter(row)
    const fileInput =
      kind === "video"
        ? rowAdapter.videoFileInput
        : rowAdapter.fileInput

    if (!fileInput) return false
    return this.assignFileToInput(fileInput, file)
  }

  assignFileToInput(input, file) {
    try {
      const DataTransferCtor = window.DataTransfer
      if (!DataTransferCtor) return false
      const dt = new DataTransferCtor()
      dt.items.add(file)
      input.files = dt.files
      return input.files && input.files.length === 1
    } catch (_error) {
      return false
    }
  }

  async triggerVideoUploadIfBound(input) {
    if (!input || !(input.files && input.files.length)) return

    const bound = await this.waitForUploaderBinding(input, 1500)
    this.debug("bulk: uploaderBound check", { bound: input?.dataset?.uploaderBound, name: input?.name })
    if (!bound) return

    this.debug("bulk: dispatch change", { name: input?.name, files: input?.files?.length })
    input.dispatchEvent(new Event("change", { bubbles: true }))
  }

  waitForUploaderBinding(input, timeoutMs = 1500) {
    if (!input) return Promise.resolve(false)
    if (input.dataset.uploaderBound === "true") return Promise.resolve(true)

    return new Promise((resolve) => {
      const startedAt = Date.now()
      const tick = () => {
        if (!document.contains(input)) return resolve(false)
        if (input.dataset.uploaderBound === "true") return resolve(true)
        if (Date.now() - startedAt >= timeoutMs) return resolve(false)
        window.setTimeout(tick, 50)
      }
      tick()
    })
  }

  showBulkFeedback(message) {
    if (!this.bulkFeedback) return
    this.bulkFeedback.textContent = message || ""
    if (this.bulkFeedbackTimer) clearTimeout(this.bulkFeedbackTimer)
    if (!message) return
    this.bulkFeedbackTimer = setTimeout(() => {
      if (this.bulkFeedback) this.bulkFeedback.textContent = ""
    }, 12000)
  }

  initMultipart(root) {
    try {
      window.initVideoMultipartUploads?.(root || this.form)
    } catch (_error) {
      // uploader module handles its own fallback warnings
    }
  }

  resolveDraftStorage() {
    try {
      if (window.sessionStorage) return window.sessionStorage
    } catch (_e) {}
    return null
  }

  resolveDraftKey() {
    if (!this.baseDraftKey) return null
    if (this.draftScope !== "new") return this.baseDraftKey
    const tabId = this.ensureDraftTabId()
    if (!tabId) return this.baseDraftKey
    return `${this.baseDraftKey}:tab:${tabId}`
  }

  ensureDraftTabId() {
    if (!this.storage) return null
    const key = "lesson-form:draft-tab-id"
    try {
      let tabId = this.storage.getItem(key)
      if (!tabId) {
        tabId = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`
        this.storage.setItem(key, tabId)
      }
      return tabId
    } catch (_e) {
      return null
    }
  }

  bindDraftRecoveryUi() {
    this.on(this.discardDraftBtn, "click", () => {
      this.clearDraft()
      window.location.reload()
    })
  }

  persistDraftSoon() {
    if (!this.storage || !this.draftKey || this.isApplyingDraft) return
    if (this.draftSaveTimer) clearTimeout(this.draftSaveTimer)
    this.draftSaveTimer = setTimeout(() => this.persistDraftNow(), 180)
  }

  persistDraftNow() {
    if (!this.storage || !this.draftKey || this.isApplyingDraft) return
    const payload = this.buildDraftPayload()
    try {
      this.storage.setItem(this.draftKey, JSON.stringify(payload))
    } catch (_e) {}
  }

  buildDraftPayload() {
    const fieldValue = (name) => this.form?.querySelector(`[name='${name}']`)?.value || ""
    const checkedValue = (name) => this.form?.querySelector(`[name='${name}']`)?.checked === true
    const selectedVisibility = this.form?.querySelector("input[name='lesson[visibility]']:checked")?.value || "subscribers"
    const selectedSubscribers = Array.from(this.form?.querySelectorAll("input[name='lesson[allowed_subscriber_ids][]']:checked") || [])
      .map((el) => el.value)
      .filter(Boolean)

    return {
      schemaVersion: this.draftSchemaVersion,
      key: this.draftKey,
      scope: this.draftScope,
      formAction: this.form?.getAttribute("action") || "",
      savedAt: new Date().toISOString(),
      fields: {
        title: fieldValue("lesson[title]"),
        description: fieldValue("lesson[description]"),
        category_id: fieldValue("lesson[category_id]"),
        visibility: selectedVisibility,
        preview: checkedValue("lesson[preview]"),
        preview_text: fieldValue("lesson[preview_text]"),
        allowed_subscriber_ids: selectedSubscribers
      },
      clientRows: this.serializeClientRows()
    }
  }

  serializeClientRows() {
    const rows = Array.from(this.mediaList?.querySelectorAll("[data-slide-row][data-client-row='true']") || [])
    return rows
      .filter((row) => !row.classList.contains("is-destroyed"))
      .map((row, index) => {
        const adapter = new LessonMediaRowAdapter(row)
        const kind = row.querySelector("input[name*='[kind]']")?.value || "image"
        const videoUrl = adapter.videoUrlInput?.value?.trim() || ""
        const signedIdField = row.querySelector("[data-video-signed-id]")
        const signedId = signedIdField?.value || ""
        const statusText = (adapter.statusEl?.textContent || "").toLowerCase()
        const hasSelectedImageFile = (adapter.imageFileInput?.files?.length || 0) > 0
        const hasSelectedVideoFile = (adapter.videoFileInput?.files?.length || 0) > 0
        const needsFileReselect =
          kind === "image"
            ? hasSelectedImageFile
            : (!signedId && hasSelectedVideoFile) || statusText.includes("failed") || statusText.includes("uploading") || statusText.includes("queued")

        return {
          index,
          kind,
          videoUrl,
          signedId,
          needsFileReselect
        }
      })
  }

  restoreDraftIfPresent() {
    if (!this.storage || !this.draftKey) return
    let parsed
    try {
      parsed = JSON.parse(this.storage.getItem(this.draftKey) || "null")
    } catch (_e) {
      return
    }

    if (!parsed || parsed.schemaVersion !== this.draftSchemaVersion) return
    if ((parsed.formAction || "") !== (this.form?.getAttribute("action") || "")) return

    const hasData = this.draftHasMeaningfulData(parsed)
    if (!hasData) return

    this.isApplyingDraft = true
    try {
      this.restoreFields(parsed.fields || {})
      this.restoreClientRows(parsed.clientRows || [])
      this.hasRestoredDraft = true
    } finally {
      this.isApplyingDraft = false
    }

    if (this.hasRestoredDraft) this.showDraftRestoredNotice(parsed.savedAt)
  }

  restoreFields(fields) {
    const setValue = (name, value, dispatchChange = false) => {
      const el = this.form?.querySelector(`[name='${name}']`)
      if (el && typeof value === "string") {
        el.value = value
        if (dispatchChange) el.dispatchEvent(new Event("change", { bubbles: true }))
      }
    }

    setValue("lesson[title]", fields.title || "")
    setValue("lesson[description]", fields.description || "")
    setValue("lesson[category_id]", fields.category_id || "", true)
    setValue("lesson[preview_text]", fields.preview_text || "")

    if (fields.visibility) {
      const visibilityRadio = this.form?.querySelector(`input[name='lesson[visibility]'][value='${fields.visibility}']`)
      if (visibilityRadio) visibilityRadio.checked = true
    }

    const previewCheckbox = this.form?.querySelector("input[name='lesson[preview]']")
    if (previewCheckbox) previewCheckbox.checked = fields.preview === true

    const selectedSubscribers = new Set(Array.isArray(fields.allowed_subscriber_ids) ? fields.allowed_subscriber_ids.map(String) : [])
    const subscriberCheckboxes = Array.from(this.form?.querySelectorAll("input[name='lesson[allowed_subscriber_ids][]']") || [])
    subscriberCheckboxes.forEach((checkbox) => {
      checkbox.checked = selectedSubscribers.has(String(checkbox.value))
    })

    this.toggleVisibility()
    this.togglePreviewVisibility()
    this.togglePreviewText()
    this.updateCount()
  }

  restoreClientRows(clientRows) {
    if (!this.mediaList || !Array.isArray(clientRows)) return
    Array.from(this.mediaList.querySelectorAll("[data-slide-row][data-client-row='true']")).forEach((row) => row.remove())

    clientRows.forEach((savedRow) => {
      const kind = savedRow?.kind === "video" ? "video" : "image"
      const row = this.appendRowForKind(kind, { videoUrl: savedRow?.videoUrl || "" })
      if (!row) return

      const adapter = new LessonMediaRowAdapter(row)
      if (kind === "video" && savedRow?.signedId && adapter.videoFileInput) {
        const videoInput = adapter.videoFileInput
        const originalName = videoInput.getAttribute("name") || savedRow?.signedIdName || ""
        let hiddenField = row.querySelector("[data-video-signed-id]")
        if (!hiddenField) {
          hiddenField = document.createElement("input")
          hiddenField.type = "hidden"
          hiddenField.dataset.videoSignedId = "true"
          videoInput.insertAdjacentElement("afterend", hiddenField)
        }

        if (originalName) {
          hiddenField.name = originalName
          hiddenField.value = savedRow.signedId
          videoInput.dataset.multipartOriginalName = originalName
          videoInput.removeAttribute("name")
          videoInput.disabled = true
          if (adapter.statusEl) {
            adapter.statusEl.classList.remove("upload-status--warning")
            adapter.statusEl.textContent = "Uploaded video restored from draft."
          }
        }
      }

      if (savedRow?.needsFileReselect && kind === "video" && adapter.statusEl) {
        adapter.statusEl.textContent = "File needs to be reselected after refresh."
        adapter.statusEl.classList.add("upload-status--warning")
      }

      if (savedRow?.needsFileReselect && kind === "image") {
        const fieldsEl = adapter.fieldsEl
        if (fieldsEl) {
          const warning = document.createElement("div")
          warning.className = "muted small-text upload-status upload-status--warning"
          warning.textContent = "File needs to be reselected after refresh."
          fieldsEl.appendChild(warning)
        }
      }

      this.attachRowHandlers(row, true)
      this.initMultipart(row)
    })

    this.reindexPositions()
    this.updateSlideLimitState()
    if (window.syncVideoMultipartSubmitState) window.syncVideoMultipartSubmitState(this.form)
  }

  showDraftRestoredNotice(savedAt) {
    if (!this.draftBanner) return
    if (this.draftBannerMessage && savedAt) {
      const time = this.formatSavedAt(savedAt)
      this.draftBannerMessage.textContent = `Your unsaved lesson changes were restored${time ? ` (${time})` : ""}.`
    }
    this.draftBanner.hidden = false
  }

  formatSavedAt(isoString) {
    try {
      const date = new Date(isoString)
      if (Number.isNaN(date.getTime())) return ""
      return date.toLocaleString()
    } catch (_e) {
      return ""
    }
  }

  clearDraft() {
    if (!this.storage || (!this.draftKey && !this.baseDraftKey)) return
    try {
      if (this.draftKey) this.storage.removeItem(this.draftKey)
      if (this.baseDraftKey && this.baseDraftKey !== this.draftKey) this.storage.removeItem(this.baseDraftKey)
    } catch (_e) {}
    if (this.draftBanner) this.draftBanner.hidden = true
  }

  draftHasMeaningfulData(draft) {
    const fields = draft?.fields || {}
    const categoryChangedFromInitial =
      typeof fields.category_id === "string" &&
      fields.category_id !== this.initialFieldValue("lesson[category_id]")
    const hasFields =
      Boolean(fields.title) ||
      Boolean(fields.description) ||
      categoryChangedFromInitial ||
      Boolean(fields.preview_text) ||
      fields.preview === true ||
      (fields.visibility && fields.visibility !== "subscribers") ||
      (Array.isArray(fields.allowed_subscriber_ids) && fields.allowed_subscriber_ids.length > 0)
    const hasRows = Array.isArray(draft?.clientRows) && draft.clientRows.length > 0
    return hasFields || hasRows
  }

  initialFieldValue(name) {
    if (!this.initialSnapshot || !name) return ""
    const value = this.initialSnapshot.get(name)
    return typeof value === "string" ? value : ""
  }
}
