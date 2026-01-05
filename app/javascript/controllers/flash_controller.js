import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["toast"]

  connect() {
    this.toastTargets.forEach((toast) => this.startTimer(toast))
  }

  dismiss(event) {
    const toast = event.target.closest(".toast")
    if (toast) this.fadeAndRemove(toast)
  }

  startTimer(toast) {
    const duration = 4000
    let timeout = setTimeout(() => this.fadeAndRemove(toast), duration)

    toast.addEventListener("mouseenter", () => clearTimeout(timeout))
    toast.addEventListener("mouseleave", () => {
      timeout = setTimeout(() => this.fadeAndRemove(toast), 800)
    })
  }

  fadeAndRemove(toast) {
    if (!toast) return
    toast.style.transition = "opacity 0.2s ease, transform 0.2s ease"
    toast.style.opacity = "0"
    toast.style.transform = "translateY(-10px)"
    setTimeout(() => toast.remove(), 220)
  }
}
