import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["categoryButton", "lessonPanel", "rowScroller", "searchInput", "lessonCard"]
  static values = { selectedId: Number }

  connect() {
    const paramId = this.selectedIdValue || this.defaultCategoryId()
    if (paramId) this.selectCategoryById(paramId)
  }

  defaultCategoryId() {
    if (this.categoryButtonTargets.length === 0) return null
    const first = this.categoryButtonTargets[0]
    return parseInt(first.dataset.categoryId, 10)
  }

  selectCategory(event) {
    const id = parseInt(event.currentTarget.dataset.categoryId, 10)
    this.selectCategoryById(id)
  }

  selectCategoryById(id) {
    this.selectedIdValue = id

    this.categoryButtonTargets.forEach((btn) => {
      const isActive = parseInt(btn.dataset.categoryId, 10) === id
      btn.classList.toggle("is-active", isActive)
      btn.setAttribute("aria-current", isActive ? "true" : "false")
    })

    this.lessonPanelTargets.forEach((panel) => {
      const isSelected = parseInt(panel.dataset.categoryId, 10) === id
      panel.classList.toggle("is-active", isSelected)
      if (isSelected) panel.scrollLeft = 0
    })

    this.filterLessons()
  }

  filterLessons() {
    const term = (this.searchInputTarget?.value || "").toLowerCase().trim()

    this.lessonCardTargets.forEach((card) => {
      const haystack = (card.dataset.search || "").toLowerCase()
      const match = !term || haystack.includes(term)
      card.classList.toggle("is-hidden", !match)
    })

    this.lessonPanelTargets.forEach((panel) => {
      const anyVisible = panel.querySelectorAll(".vault-lesson-card:not(.is-hidden)").length > 0
      panel.classList.toggle("is-hidden", !anyVisible && term.length > 0)
    })
  }
}
