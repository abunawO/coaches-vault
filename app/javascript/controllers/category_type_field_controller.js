import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["valueInput", "option", "customWrap", "customInput"]

  connect() {
    this.render()
  }

  select(event) {
    if (!this.hasValueInputTarget) return
    this.valueInputTarget.value = event.currentTarget.dataset.value || ""
    this.render()
  }

  render() {
    if (!this.hasValueInputTarget || !this.hasCustomWrapTarget) return

    const selectedValue = this.valueInputTarget.value
    const showCustom = selectedValue === "__custom__"
    this.customWrapTarget.classList.toggle("is-hidden", !showCustom)

    this.optionTargets.forEach((option) => {
      const isActive = (option.dataset.value || "") === selectedValue
      option.classList.toggle("is-active", isActive)
      option.setAttribute("aria-pressed", isActive ? "true" : "false")
    })

    if (this.hasCustomInputTarget) {
      this.customInputTarget.required = showCustom
      if (!showCustom) this.customInputTarget.value = ""
    }
  }
}
