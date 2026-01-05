import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["search", "option", "checkbox", "submit", "empty", "list", "count"]

  connect() {
    this.updateSubmit()
  }

  filter() {
    const query = (this.searchTarget?.value || "").toLowerCase().trim()
    let visibleCount = 0
    this.optionTargets.forEach((option) => {
      const text = (option.dataset.search || "").toLowerCase()
      const match = query === "" || text.includes(query)
      option.classList.toggle("is-hidden", !match)
      if (match) visibleCount += 1
    })
    if (this.hasEmptyTarget) {
      this.emptyTarget.classList.toggle("is-hidden", visibleCount > 0)
    }
    this.updateSubmit()
  }

  selectAll() {
    this.optionTargets.forEach((option) => {
      if (!option.classList.contains("is-hidden")) {
        const checkbox = option.querySelector("input[type='checkbox']")
        if (checkbox) checkbox.checked = true
      }
    })
    this.updateSubmit()
  }

  clear() {
    this.checkboxTargets.forEach((checkbox) => {
      checkbox.checked = false
    })
    this.updateSubmit()
  }

  updateSubmit() {
    const checked = this.checkboxTargets.filter((cb) => cb.checked).length
    const anyChecked = checked > 0
    if (this.hasSubmitTarget) {
      this.submitTarget.disabled = !anyChecked
      this.submitTarget.textContent = anyChecked ? `Add selected (${checked})` : "Add selected"
    }
    if (this.hasCountTarget) {
      this.countTarget.textContent = anyChecked ? `${checked} selected` : ""
    }
  }
}
