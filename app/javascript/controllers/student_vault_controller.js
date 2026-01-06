import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["categoryDetails", "categoryButton", "searchInput", "lessonCard"]
  static values = { selectedId: Number }

  connect() {
    const paramId = this.selectedIdValue || this.defaultCategoryId()
    if (paramId) this.selectCategoryById(paramId)
  }

  defaultCategoryId() {
    if (this.categoryDetailsTargets.length === 0) return null
    const first = this.categoryDetailsTargets[0]
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

    this.categoryDetailsTargets.forEach((details) => {
      const isSelected = parseInt(details.dataset.categoryId, 10) === id
      details.open = isSelected
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

    if (!term) return

    this.categoryDetailsTargets.forEach((details) => {
      const visibleCount = details.querySelectorAll(".vault-lesson-card:not(.is-hidden)").length
      details.open = visibleCount > 0
    })
  }
}
