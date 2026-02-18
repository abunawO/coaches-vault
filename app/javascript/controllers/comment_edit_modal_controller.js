import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["dialog", "title", "form", "textarea", "submitLabel"]

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
    const action = trigger.dataset.editAction || "#"
    const body = trigger.dataset.editBody || ""
    const title = trigger.dataset.editTitle || "Edit comment"
    const submitLabel = trigger.dataset.editSubmitLabel || "Save"

    this.titleTarget.textContent = title
    this.formTarget.action = action
    this.textareaTarget.value = body
    this.submitLabelTarget.textContent = submitLabel
    this.dialogTarget.hidden = false
    document.body.style.overflow = "hidden"
    this.textareaTarget.focus()
    this.textareaTarget.setSelectionRange(this.textareaTarget.value.length, this.textareaTarget.value.length)
  }

  close() {
    if (!this.hasDialogTarget) return
    this.dialogTarget.hidden = true
    document.body.style.overflow = ""
  }

  backdrop(event) {
    if (event.target === this.dialogTarget) this.close()
  }

  handleKeydown(event) {
    if (event.key === "Escape" && this.hasDialogTarget && !this.dialogTarget.hidden) {
      this.close()
    }
  }
}
