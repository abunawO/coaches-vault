import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = [
    "searchInput",
    "typeFilter",
    "navItem",
    "typeGroup",
    "sectionPanel",
    "lessonCard",
    "resultsSummary",
    "resultsCount",
    "sectionVisibleCount",
    "navVisibleCount",
    "noSelection",
    "noResults",
    "clearButton"
  ]

  static values = {
    initialSectionId: Number,
    selectedSectionId: Number,
    selectedType: { type: String, default: "all" }
  }

  connect() {
    const initialSectionId = this.resolveInitialSectionId()
    if (initialSectionId) this.selectedSectionIdValue = initialSectionId
    this.syncInitialGroupState()
    this.filter()
  }

  toggleGroup(event) {
    const group = event.currentTarget.closest('[data-student-vault-target="typeGroup"]')
    if (!group) return

    const isExpanded = group.classList.contains("is-expanded")
    this.setGroupExpanded(group, !isExpanded)
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

  selectType(event) {
    const nextType = (event.currentTarget.dataset.type || "all").trim()
    this.selectedTypeValue = nextType.length > 0 ? nextType : "all"
    this.filter()
  }

  clearSearch() {
    if (this.hasSearchInputTarget) this.searchInputTarget.value = ""
    this.filter()
  }

  filter() {
    const term = this.searchTerm()
    const typeFilter = this.selectedType()
    const visibleBySection = new Map()
    const allowedSections = new Set()

    this.sectionPanelTargets.forEach((panel) => {
      const sectionId = this.sectionIdFromElement(panel)
      if (!sectionId) return

      visibleBySection.set(sectionId, 0)
      const sectionType = (panel.dataset.categoryType || "").trim()
      if (typeFilter === "all" || sectionType === typeFilter) {
        allowedSections.add(sectionId)
      }
    })

    this.lessonCardTargets.forEach((card) => {
      const haystack = (card.dataset.search || "").toLowerCase()
      const sectionId = this.sectionIdFromElement(card)
      const inSelectedType = sectionId ? allowedSections.has(sectionId) : false
      const match = inSelectedType && (term.length === 0 || haystack.includes(term))
      card.classList.toggle("is-hidden", !match)

      if (!match) return

      if (!sectionId) return
      visibleBySection.set(sectionId, (visibleBySection.get(sectionId) || 0) + 1)
    })

    const filtersActive = term.length > 0 || typeFilter !== "all"
    if (filtersActive) {
      if (this.hasSelectedSectionIdValue) {
        const selectedVisible = visibleBySection.get(this.selectedSectionIdValue) || 0
        if (selectedVisible === 0) {
          const firstMatching = Array.from(visibleBySection.entries()).find(([, count]) => count > 0)
          if (firstMatching) this.selectedSectionIdValue = firstMatching[0]
        }
      } else {
        const firstMatching = Array.from(visibleBySection.entries()).find(([, count]) => count > 0)
        if (firstMatching) this.selectedSectionIdValue = firstMatching[0]
      }
    }

    this.applyVisibilityMetadata(visibleBySection)
    this.renderState()
  }

  renderState() {
    const term = this.searchTerm()
    const typeFilter = this.selectedType()
    const termActive = term.length > 0
    const typeFilterActive = typeFilter !== "all"
    const totalVisible = this.totalVisibleLessons()
    const selectedId = this.hasSelectedSectionIdValue ? this.selectedSectionIdValue : null

    this.typeFilterTargets.forEach((filterButton) => {
      const filterType = (filterButton.dataset.type || "all").trim()
      filterButton.classList.toggle("is-active", filterType === typeFilter)
      filterButton.setAttribute("aria-pressed", filterType === typeFilter ? "true" : "false")
    })

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
      if (termActive || typeFilterActive) shouldShow = isSelected && visibleCount > 0

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
        this.resultsSummaryTarget.innerHTML = `Explore <strong>${totalVisible}</strong> lessons across this vault`
      }
    }

    if (this.hasClearButtonTarget) {
      this.clearButtonTarget.classList.toggle("is-hidden", !termActive)
    }

    let showNoResults = false
    let showNoResultsByType = false
    if (this.hasNoResultsTarget) {
      showNoResults = termActive && totalVisible === 0
      showNoResultsByType = typeFilterActive && totalVisible === 0
      this.noResultsTarget.classList.toggle("is-hidden", !(showNoResults || showNoResultsByType))
    }

    if (this.hasNoSelectionTarget) {
      const showNoSelection = !selectedId && !(showNoResults || showNoResultsByType)
      this.noSelectionTarget.classList.toggle("is-hidden", !showNoSelection)
    }

    this.renderTypeGroups()
    this.syncExpandedGroupsAfterFilter()
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

      const shouldDim = (this.searchTerm().length > 0 || this.selectedType() !== "all") && visible === 0
      item.classList.toggle("is-dimmed", shouldDim)
    })
  }

  renderTypeGroups() {
    if (!this.hasTypeGroupTarget) return

    const filtersActive = this.searchTerm().length > 0 || this.selectedType() !== "all"
    this.typeGroupTargets.forEach((group) => {
      if (!filtersActive) {
        group.classList.remove("is-hidden")
        return
      }

      const itemElements = Array.from(group.querySelectorAll('[data-student-vault-target="navItem"]'))
      const hasVisibleItems = itemElements.some((item) => Number(item.dataset.visibleCount || "0") > 0)
      group.classList.toggle("is-hidden", !hasVisibleItems)
    })
  }

  syncInitialGroupState() {
    if (!this.hasTypeGroupTarget) return

    this.typeGroupTargets.forEach((group) => {
      this.setGroupExpanded(group, false)
    })
  }

  syncExpandedGroupsAfterFilter() {
    if (!this.hasTypeGroupTarget) return
  }

  groupForSectionId(sectionId) {
    if (!sectionId) return null

    const item = this.navItemTargets.find((navItem) => this.sectionIdFromElement(navItem) === sectionId)
    if (!item) return null

    return item.closest('[data-student-vault-target="typeGroup"]')
  }

  setGroupExpanded(group, expanded) {
    if (!group) return

    group.classList.toggle("is-expanded", expanded)
    const toggle = group.querySelector(".vault-rail__group-toggle")
    if (toggle) toggle.setAttribute("aria-expanded", expanded ? "true" : "false")
  }

  totalVisibleLessons() {
    return this.sectionPanelTargets.reduce((sum, panel) => sum + Number(panel.dataset.visibleCount || "0"), 0)
  }

  resolveInitialSectionId() {
    if (this.hasInitialSectionIdValue && this.initialSectionIdValue > 0) return this.initialSectionIdValue

    return null
  }

  sectionIdFromElement(element) {
    return parseInt(element?.dataset.sectionId || "", 10) || null
  }

  searchTerm() {
    return (this.searchInputTarget?.value || "").toLowerCase().trim()
  }

  selectedType() {
    return (this.selectedTypeValue || "all").trim()
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
