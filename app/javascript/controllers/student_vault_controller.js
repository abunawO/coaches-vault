import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = [
    "searchInput",
    "navItem",
    "sectionPanel",
    "lessonCard",
    "resultsSummary",
    "resultsCount",
    "sectionVisibleCount",
    "navVisibleCount",
    "noResults",
    "clearButton"
  ]

  static values = {
    initialSectionId: Number,
    selectedSectionId: Number
  }

  connect() {
    const initialSectionId = this.resolveInitialSectionId()
    if (initialSectionId) this.selectedSectionIdValue = initialSectionId
    this.filter()
  }

  selectSection(event) {
    const nextId = this.sectionIdFromElement(event.currentTarget)
    if (!nextId) return

    const termActive = this.searchTerm().length > 0
    const visibleCount = Number(event.currentTarget.dataset.visibleCount || "0")
    if (termActive && visibleCount === 0) return

    this.selectedSectionIdValue = nextId
    this.renderState()
  }

  clearSearch() {
    if (this.hasSearchInputTarget) this.searchInputTarget.value = ""
    this.filter()
  }

  filter() {
    const term = this.searchTerm()
    const visibleBySection = new Map()

    this.sectionPanelTargets.forEach((panel) => {
      const sectionId = this.sectionIdFromElement(panel)
      if (sectionId) visibleBySection.set(sectionId, 0)
    })

    this.lessonCardTargets.forEach((card) => {
      const haystack = (card.dataset.search || "").toLowerCase()
      const match = term.length === 0 || haystack.includes(term)
      card.classList.toggle("is-hidden", !match)

      if (!match) return

      const sectionId = this.sectionIdFromElement(card)
      if (!sectionId) return
      visibleBySection.set(sectionId, (visibleBySection.get(sectionId) || 0) + 1)
    })

    if (term.length > 0 && this.selectedSectionIdValue) {
      const selectedVisible = visibleBySection.get(this.selectedSectionIdValue) || 0
      if (selectedVisible === 0) {
        const firstMatching = Array.from(visibleBySection.entries()).find(([, count]) => count > 0)
        if (firstMatching) this.selectedSectionIdValue = firstMatching[0]
      }
    }

    this.applyVisibilityMetadata(visibleBySection)
    this.renderState()
  }

  renderState() {
    const term = this.searchTerm()
    const termActive = term.length > 0
    const totalVisible = this.totalVisibleLessons()
    const selectedId = this.hasSelectedSectionIdValue ? this.selectedSectionIdValue : null

    this.navItemTargets.forEach((item) => {
      const sectionId = this.sectionIdFromElement(item)
      const isActive = selectedId && sectionId === selectedId
      item.classList.toggle("is-active", !!isActive)
      item.setAttribute("aria-current", isActive ? "true" : "false")
    })

    this.sectionPanelTargets.forEach((panel) => {
      const sectionId = this.sectionIdFromElement(panel)
      const visibleCount = Number(panel.dataset.visibleCount || "0")
      const isSelected = selectedId && sectionId === selectedId

      let shouldShow = isSelected
      if (termActive) shouldShow = isSelected && visibleCount > 0

      panel.classList.toggle("is-active", !!shouldShow)
      panel.classList.toggle("is-hidden", !shouldShow)
    })

    if (this.hasResultsCountTarget) {
      this.resultsCountTarget.textContent = String(totalVisible)
    }

    if (this.hasResultsSummaryTarget) {
      if (termActive) {
        this.resultsSummaryTarget.innerHTML = `Search results for <strong>"${this.escapeHtml(term)}"</strong>: <strong>${totalVisible}</strong> lesson${totalVisible === 1 ? "" : "s"}`
      } else {
        this.resultsSummaryTarget.innerHTML = `Browse <strong>${totalVisible}</strong> lessons across the coach vault sections`
      }
    }

    if (this.hasClearButtonTarget) {
      this.clearButtonTarget.classList.toggle("is-hidden", !termActive)
    }

    if (this.hasNoResultsTarget) {
      const showNoResults = termActive && totalVisible === 0
      this.noResultsTarget.classList.toggle("is-hidden", !showNoResults)
    }
  }

  applyVisibilityMetadata(visibleBySection) {
    this.sectionPanelTargets.forEach((panel) => {
      const sectionId = this.sectionIdFromElement(panel)
      if (!sectionId) return

      const visible = visibleBySection.get(sectionId) || 0
      panel.dataset.visibleCount = String(visible)

      const countEl = panel.querySelector('[data-student-vault-target="sectionVisibleCount"]')
      if (countEl) countEl.textContent = String(visible)
    })

    this.navItemTargets.forEach((item) => {
      const sectionId = this.sectionIdFromElement(item)
      if (!sectionId) return

      const visible = visibleBySection.get(sectionId) || 0
      item.dataset.visibleCount = String(visible)

      const countEl = item.querySelector('[data-student-vault-target="navVisibleCount"]')
      if (countEl) countEl.textContent = String(visible)

      const shouldDim = this.searchTerm().length > 0 && visible === 0
      item.classList.toggle("is-dimmed", shouldDim)
    })
  }

  totalVisibleLessons() {
    return this.sectionPanelTargets.reduce((sum, panel) => sum + Number(panel.dataset.visibleCount || "0"), 0)
  }

  resolveInitialSectionId() {
    if (this.hasInitialSectionIdValue && this.initialSectionIdValue > 0) return this.initialSectionIdValue

    if (this.navItemTargets.length === 0) return null
    return this.sectionIdFromElement(this.navItemTargets[0])
  }

  sectionIdFromElement(element) {
    return parseInt(element?.dataset.sectionId || "", 10) || null
  }

  searchTerm() {
    return (this.searchInputTarget?.value || "").toLowerCase().trim()
  }

  escapeHtml(text) {
    return text
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;")
  }
}
