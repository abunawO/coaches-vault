import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["status", "error", "submit", "cancel", "overlay", "overlayMessage"]
  static values = {
    successDuration: { type: Number, default: 1000 }
  }

  connect() {
    this.isLocked = false
    this.previouslyDisabled = new WeakSet()
    this.successTimeout = null
    this.disableTimeout = null
    this.originalSubmitLabel = this.readSubmitLabel()
  }

  disconnect() {
    this.clearSuccessTimeout()
    this.clearDisableTimeout()
  }

  handleSubmit(event) {
    if (this.isLocked) {
      event.preventDefault()
      event.stopImmediatePropagation()
      return
    }

    this.lockUI()
  }

  handleTurboEnd(event) {
    if (!this.isLocked) return
    const success = this.resolveTurboSuccess(event.detail)
    success ? this.handleSuccess() : this.handleFailure()
  }

  handleAjaxComplete(event) {
    if (!this.isLocked) return
    const status = this.resolveAjaxStatus(event.detail)
    const success = typeof status === "number" ? status >= 200 && status < 300 : false
    success ? this.handleSuccess() : this.handleFailure()
  }

  handleCancelClick(event) {
    if (this.isLocked) {
      event.preventDefault()
      event.stopPropagation()
    }
  }

  lockUI() {
    this.clearSuccessTimeout()
    this.clearDisableTimeout()
    this.isLocked = true
    this.hideError()
    this.showStatus("Saving your lesson...")
    this.setSubmitLabel("Saving...")
    this.showOverlay("Saving your lesson...")
    // Defer disabling fields so file inputs remain included in the outgoing request
    this.disableTimeout = setTimeout(() => this.toggleFormElements(true), 0)
    this.disableCancel()
  }

  handleSuccess() {
    this.unlockForm()
    this.hideOverlay()
    this.showStatus("Saved ✓")
    this.setSubmitLabel("Saved ✓")
    this.successTimeout = setTimeout(() => {
      this.resetSubmitLabel()
      this.hideStatus()
    }, this.successDurationValue)
  }

  handleFailure() {
    this.unlockForm()
    this.hideOverlay()
    this.resetSubmitLabel()
    this.hideStatus()
    this.showError("Something went wrong. Please try again.")
  }

  unlockForm() {
    this.clearDisableTimeout()
    this.toggleFormElements(false)
    this.enableCancel()
    this.isLocked = false
  }

  toggleFormElements(disabled) {
    const controls = this.element.querySelectorAll("input, textarea, select, button")
    if (disabled) {
      this.previouslyDisabled = new WeakSet()
    }

    controls.forEach((control) => {
      if (control.tagName === "INPUT" && control.type === "hidden") return
      if (disabled) {
        if (control.disabled) this.previouslyDisabled.add(control)
        control.disabled = true
      } else {
        control.disabled = this.previouslyDisabled.has(control)
      }
    })

    if (!disabled) {
      this.previouslyDisabled = new WeakSet()
    }
  }

  showStatus(text) {
    if (!this.hasStatusTarget) return
    this.statusTarget.textContent = text
    this.statusTarget.style.display = "inline"
  }

  hideStatus() {
    if (!this.hasStatusTarget) return
    this.statusTarget.textContent = ""
    this.statusTarget.style.display = "none"
  }

  showError(text) {
    if (!this.hasErrorTarget) return
    this.errorTarget.textContent = text
    this.errorTarget.style.display = "inline"
  }

  hideError() {
    if (!this.hasErrorTarget) return
    this.errorTarget.textContent = ""
    this.errorTarget.style.display = "none"
  }

  showOverlay(message) {
    if (!this.hasOverlayTarget) return
    this.overlayTarget.style.display = "flex"
    this.overlayTarget.setAttribute("aria-hidden", "false")
    this.setOverlayMessage(message)
  }

  hideOverlay() {
    if (!this.hasOverlayTarget) return
    this.overlayTarget.style.display = "none"
    this.overlayTarget.setAttribute("aria-hidden", "true")
    this.setOverlayMessage("")
  }

  setOverlayMessage(message) {
    if (!this.hasOverlayMessageTarget) return
    this.overlayMessageTarget.textContent = message || ""
  }

  disableCancel() {
    if (!this.hasCancelTarget) return
    this.cancelTarget.classList.add("is-disabled")
    this.cancelTarget.setAttribute("aria-disabled", "true")
    this.cancelTarget.style.pointerEvents = "none"
    this.cancelTarget.setAttribute("tabindex", "-1")
  }

  enableCancel() {
    if (!this.hasCancelTarget) return
    this.cancelTarget.classList.remove("is-disabled")
    this.cancelTarget.removeAttribute("aria-disabled")
    this.cancelTarget.style.pointerEvents = ""
    this.cancelTarget.removeAttribute("tabindex")
  }

  setSubmitLabel(text) {
    const el = this.submitElement
    if (!el) return
    if (el.tagName === "BUTTON") {
      el.textContent = text
    } else {
      el.value = text
    }
  }

  resetSubmitLabel() {
    if (this.originalSubmitLabel) {
      this.setSubmitLabel(this.originalSubmitLabel)
    }
  }

  readSubmitLabel() {
    const el = this.submitElement
    if (!el) return ""
    return el.tagName === "BUTTON" ? (el.textContent || "").trim() : el.value || ""
  }

  resolveTurboSuccess(detail = {}) {
    if (typeof detail.success === "boolean") return detail.success
    if (detail.fetchResponse && typeof detail.fetchResponse.succeeded === "boolean") {
      return detail.fetchResponse.succeeded
    }
    if (detail.response && typeof detail.response.ok === "boolean") return detail.response.ok
    return false
  }

  resolveAjaxStatus(detail) {
    if (!detail) return null
    if (typeof detail.status === "number") return detail.status
    if (detail.xhr && typeof detail.xhr.status === "number") return detail.xhr.status
    if (Array.isArray(detail)) {
      const candidate = detail.find((entry) => entry && typeof entry.status === "number")
      if (candidate) return candidate.status
    }
    return null
  }

  clearSuccessTimeout() {
    if (this.successTimeout) {
      clearTimeout(this.successTimeout)
      this.successTimeout = null
    }
  }

  clearDisableTimeout() {
    if (this.disableTimeout) {
      clearTimeout(this.disableTimeout)
      this.disableTimeout = null
    }
  }

  get submitElement() {
    if (!this._submitElement) {
      this._submitElement = this.hasSubmitTarget
        ? this.submitTarget
        : this.element.querySelector("button[type='submit'], input[type='submit']")
    }
    return this._submitElement
  }
}
