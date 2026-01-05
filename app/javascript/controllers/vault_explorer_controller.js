import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["categoryItem", "searchInput", "createPanel", "createButton", "categoryNameInput"]
  static values = { selectedId: Number }

  connect() {
    this.updateSelection()
    this.filter()
    this.updateCreateButtonVisibility()
    window.addEventListener("popstate", this.syncFromLocation)
  }

  toggleCreatePanel() {
    if (!this.hasCreatePanelTarget) return
    const hidden = this.createPanelTarget.classList.toggle("is-hidden")
    this.updateCreateButtonVisibility(hidden)
    if (!hidden && this.hasCategoryNameInputTarget) {
      this.categoryNameInputTarget.focus()
    }
  }

  closeCreatePanel() {
    if (this.hasCreatePanelTarget) {
      this.createPanelTarget.classList.add("is-hidden")
    }
    this.updateCreateButtonVisibility(true)
  }

  disconnect() {
    window.removeEventListener("popstate", this.syncFromLocation)
  }

  syncFromLocation = () => {
    const url = new URL(window.location.href)
    const id = url.searchParams.get("category_id")
    this.selectedIdValue = id ? parseInt(id, 10) : null
    this.updateSelection()
  }

  pushState(event) {
    const { categoryId } = event.currentTarget.dataset
    if (categoryId) {
      this.selectedIdValue = parseInt(categoryId, 10)
      this.updateSelection()
      const url = event.currentTarget.href
      window.history.pushState({}, "", url)
    }
  }

  filter() {
    if (!this.hasSearchInputTarget) return
    const q = this.searchInputTarget.value.toLowerCase()
    this.categoryItemTargets.forEach((item) => {
      const text = (item.dataset.search || "").toLowerCase()
      item.classList.toggle("is-hidden", q && !text.includes(q))
    })
  }

  updateSelection() {
    this.categoryItemTargets.forEach((item) => {
      const id = parseInt(item.dataset.categoryId, 10)
      const selected = this.selectedIdValue && id === this.selectedIdValue
      item.classList.toggle("is-selected", selected)
      item.setAttribute("aria-current", selected ? "true" : "false")
    })
  }

  updateCreateButtonVisibility(forceShow = null) {
    if (!this.hasCreateButtonTarget) return
    const shouldShow = forceShow === null ? this.createPanelTarget?.classList.contains("is-hidden") : forceShow
    this.createButtonTarget.classList.toggle("is-hidden", !shouldShow)
  }
}
