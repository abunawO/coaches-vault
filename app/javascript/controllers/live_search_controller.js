import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["input"]

  connect() {
    this.timeout = null
  }

  disconnect() {
    this.clear()
  }

  changed() {
    this.clear()
    this.timeout = setTimeout(() => this.submit(), 250)
  }

  clear() {
    if (this.timeout) {
      clearTimeout(this.timeout)
      this.timeout = null
    }
  }

  submit() {
    const form = this.element.closest("form") || this.element
    if (form && form.requestSubmit) form.requestSubmit()
  }
}
