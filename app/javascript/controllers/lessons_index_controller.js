import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["search", "card", "visibilityButton", "empty"]

  connect() {
    this.activeVisibility = "all"
    this.updateVisibilityButtons()
    this.filter()
  }

  search() {
    this.filter()
  }

  setVisibility(event) {
    event.preventDefault()
    this.activeVisibility = (event.currentTarget.dataset.visibility || "all").trim().toLowerCase()
    this.updateVisibilityButtons()
    this.filter()
  }

  filter() {
    const term = this.hasSearchTarget ? this.searchTarget.value.trim().toLowerCase() : ""
    let visibleCount = 0

    this.cardTargets.forEach((card) => {
      const searchText = (card.dataset.searchText || "").toLowerCase()
      const visibility = (card.dataset.visibility || "").toLowerCase()
      const matchesTerm = term.length === 0 || searchText.includes(term)
      const matchesVisibility = this.activeVisibility === "all" || visibility === this.activeVisibility
      const show = matchesTerm && matchesVisibility

      card.hidden = !show
      if (show) visibleCount += 1
    })

    if (this.hasEmptyTarget) {
      this.emptyTarget.hidden = visibleCount > 0
    }
  }

  updateVisibilityButtons() {
    this.visibilityButtonTargets.forEach((button) => {
      const visibility = (button.dataset.visibility || "all").trim().toLowerCase()
      const isActive = visibility === this.activeVisibility
      button.classList.toggle("is-active", isActive)
      button.setAttribute("aria-pressed", isActive ? "true" : "false")
    })
  }
}
