import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["chips", "inputs", "submit"]

  connect() {
    this.selectedIds = new Set()
    this.updateSubmit()
  }

  toggle(event) {
    const button = event.currentTarget
    const id = button.dataset.id
    if (!id) return

    if (this.selectedIds.has(id)) {
      this.selectedIds.delete(id)
      button.classList.remove("vault-chip--selected")
    } else {
      this.selectedIds.add(id)
      button.classList.add("vault-chip--selected")
    }

    this.renderInputs()
    this.updateSubmit()
  }

  renderInputs() {
    if (!this.hasInputsTarget) return
    this.inputsTarget.innerHTML = ""
    this.selectedIds.forEach((id) => {
      const input = document.createElement("input")
      input.type = "hidden"
      input.name = "lesson_ids[]"
      input.value = id
      this.inputsTarget.appendChild(input)
    })
  }

  updateSubmit() {
    if (!this.hasSubmitTarget) return
    this.submitTarget.disabled = this.selectedIds.size === 0
  }
}
