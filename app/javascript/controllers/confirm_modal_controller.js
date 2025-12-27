import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["dialog", "panel", "cancelButton", "title", "body", "form", "methodField", "confirmButton"]

  connect() {
    this.close()
    this.handleKeydown = this.handleKeydown.bind(this)
    document.addEventListener("keydown", this.handleKeydown)
  }

  disconnect() {
    document.removeEventListener("keydown", this.handleKeydown)
  }

  open(event) {
    event.preventDefault()
    event.stopPropagation()
    const trigger = event.currentTarget
    const title = trigger.dataset.confirmTitle || "Are you sure?"
    const body = trigger.dataset.confirmBody || ""
    const action = trigger.dataset.confirmUrl || trigger.dataset.confirmAction || "#"
    const method = (trigger.dataset.confirmMethod || "post").toLowerCase()
    const label = trigger.dataset.confirmLabel || "Confirm"

    this.titleTarget.textContent = title
    this.bodyTarget.textContent = body
    this.formTarget.action = action
    this.methodFieldTarget.value = method === "post" ? "" : method
    this.confirmButtonTarget.value = label
    this.dialogTarget.hidden = false
    document.body.style.overflow = "hidden"
    this.cancelButtonTarget?.focus()
  }

  close() {
    if (!this.dialogTarget) return
    this.dialogTarget.hidden = true
    document.body.style.overflow = ""
  }

  backdrop(e) {
    if (e.target === this.dialogTarget) {
      this.close()
    }
  }

  handleKeydown(e) {
    if (e.key === "Escape" && !this.dialogTarget.hidden) {
      this.close()
    }
  }
}
