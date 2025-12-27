import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["desc", "toggle", "overlay"]

  connect() {
    this.element.dataset.hasToggle = "false"
    if (!this.hasDescTarget || !this.hasToggleTarget) return

    const desc = this.descTarget
    const wasExpanded = this.element.dataset.expanded === "true"
    this.element.dataset.expanded = "false"

    const needsToggle = desc.scrollHeight > desc.clientHeight + 2
    if (needsToggle) {
      this.element.dataset.hasToggle = "true"
    } else {
      this.toggleTarget.style.display = "none"
    }

    if (wasExpanded) this.expand()

    this.handleOutside = this.closeIfOutside.bind(this)
    document.addEventListener("click", this.handleOutside, true)
    document.addEventListener("keydown", this.handleEscape)
  }

  toggle() {
    const expanded = this.element.dataset.expanded === "true"
    expanded ? this.collapse() : this.expand()
  }

  expand() {
    this.element.dataset.expanded = "true"
    this.toggleTarget.textContent = "Show less"
    this.toggleTarget.setAttribute("aria-expanded", "true")
  }

  collapse() {
    this.element.dataset.expanded = "false"
    this.toggleTarget.textContent = "Show more"
    this.toggleTarget.setAttribute("aria-expanded", "false")
  }

  closeIfOutside(event) {
    if (this.element.dataset.expanded !== "true") return
    if (!this.element.contains(event.target)) {
      this.collapse()
    }
  }

  handleEscape = (event) => {
    if (event.key === "Escape" && this.element.dataset.expanded === "true") {
      this.collapse()
    }
  }

  disconnect() {
    document.removeEventListener("click", this.handleOutside, true)
    document.removeEventListener("keydown", this.handleEscape)
  }
}
