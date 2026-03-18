import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["nativeSelect", "trigger", "selectedLabel", "selectedMeta", "overlay", "sheet", "row", "searchInput", "emptyState", "list"]
  static values = { mobileBreakpoint: { type: Number, default: 767 } }

  connect() {
    this.onMediaQueryChange = () => this.handleViewportChange()
    this.boundEscapeHandler = (event) => this.handleEscape(event)
    this.mediaQuery = window.matchMedia(`(max-width: ${this.mobileBreakpointValue}px)`)

    if (typeof this.mediaQuery.addEventListener === "function") {
      this.mediaQuery.addEventListener("change", this.onMediaQueryChange)
    } else if (typeof this.mediaQuery.addListener === "function") {
      this.mediaQuery.addListener(this.onMediaQueryChange)
    }

    this.syncSelectedState()
    requestAnimationFrame(() => this.syncSelectedState())
    setTimeout(() => this.syncSelectedState(), 120)
    document.addEventListener("keydown", this.boundEscapeHandler)
    this.handleViewportChange()
  }

  disconnect() {
    if (this.mediaQuery) {
      if (typeof this.mediaQuery.removeEventListener === "function") {
        this.mediaQuery.removeEventListener("change", this.onMediaQueryChange)
      } else if (typeof this.mediaQuery.removeListener === "function") {
        this.mediaQuery.removeListener(this.onMediaQueryChange)
      }
    }

    document.removeEventListener("keydown", this.boundEscapeHandler)
    this.unlockBodyScroll()
  }

  open() {
    if (!this.isMobile() || !this.hasSheetTarget || !this.hasOverlayTarget) return

    this.element.classList.add("is-open")
    this.overlayTarget.setAttribute("aria-hidden", "false")
    this.sheetTarget.setAttribute("aria-hidden", "false")
    if (this.hasTriggerTarget) this.triggerTarget.setAttribute("aria-expanded", "true")
    this.lockBodyScroll()
    this.filter()
    if (this.hasSearchInputTarget) {
      requestAnimationFrame(() => this.focusSearchInput())
    }
    requestAnimationFrame(() => this.scrollSelectedRowIntoView())
  }

  close() {
    this.element.classList.remove("is-open")
    if (this.hasOverlayTarget) this.overlayTarget.setAttribute("aria-hidden", "true")
    if (this.hasSheetTarget) this.sheetTarget.setAttribute("aria-hidden", "true")
    if (this.hasTriggerTarget) this.triggerTarget.setAttribute("aria-expanded", "false")
    this.blurSearchInput()
    this.resetSearch()
    this.unlockBodyScroll()
  }

  select(event) {
    const row = event.currentTarget
    const value = row.dataset.value || ""
    if (this.hasNativeSelectTarget) {
      this.nativeSelectTarget.value = value
      this.nativeSelectTarget.dispatchEvent(new Event("change", { bubbles: true }))
    }
    this.close()
  }

  syncFromSelect() {
    this.syncSelectedState()
  }

  filter() {
    const query = this.hasSearchInputTarget ? this.searchInputTarget.value.trim().toLowerCase() : ""
    let visibleCategoryCount = 0

    this.rowTargets.forEach((row) => {
      const isNoCategoryRow = String(row.dataset.value || "") === ""
      const matches = isNoCategoryRow || query.length === 0 || this.matchesRowSearch(row, query)

      row.hidden = !matches
      if (!isNoCategoryRow && matches) visibleCategoryCount += 1
    })

    if (this.hasEmptyStateTarget) {
      this.emptyStateTarget.hidden = visibleCategoryCount > 0
    }
  }

  handleViewportChange() {
    if (!this.isMobile()) this.close()
    if (!this.isMobile()) this.resetSearch()
    this.syncSelectedState()
  }

  handleEscape(event) {
    if (event.key === "Escape" && this.element.classList.contains("is-open")) {
      this.close()
    }
  }

  syncSelectedState() {
    const selectedValue = this.hasNativeSelectTarget ? String(this.nativeSelectTarget.value || "") : ""
    const selectedOption = this.resolveSelectedOption(selectedValue)

    if (this.hasSelectedLabelTarget) {
      this.selectedLabelTarget.textContent = selectedOption?.label || "No category"
    }

    if (this.hasSelectedMetaTarget) {
      const fallback = selectedValue ? "Category selected for this lesson." : "Leave this lesson uncategorized for now."
      this.selectedMetaTarget.textContent = selectedOption?.meta || fallback
    }

    this.rowTargets.forEach((row) => {
      const isSelected = String(row.dataset.value || "") === selectedValue
      row.classList.toggle("is-selected", isSelected)
      row.setAttribute("aria-selected", isSelected ? "true" : "false")
    })
  }

  resolveSelectedOption(value) {
    const row = this.rowTargets.find((candidate) => String(candidate.dataset.value || "") === String(value || ""))
    if (row) {
      return {
        label: row.dataset.label || "No category",
        meta: row.dataset.meta || ""
      }
    }

    if (!this.hasNativeSelectTarget) return null
    const option = Array.from(this.nativeSelectTarget.options).find((candidate) => String(candidate.value || "") === String(value || ""))
    if (!option) return null

    return {
      label: option.textContent?.trim() || "No category",
      meta: ""
    }
  }

  isMobile() {
    return Boolean(this.mediaQuery?.matches)
  }

  matchesRowSearch(row, query) {
    const searchableText = (row.dataset.searchText || `${row.dataset.label || ""} ${row.dataset.meta || ""}`).toLowerCase()
    return searchableText.includes(query)
  }

  resetSearch() {
    if (this.hasSearchInputTarget && this.searchInputTarget.value !== "") {
      this.searchInputTarget.value = ""
    }
    this.filter()
  }

  focusSearchInput() {
    if (!this.hasSearchInputTarget) return
    try {
      this.searchInputTarget.focus({ preventScroll: true })
    } catch (_error) {
      this.searchInputTarget.focus()
    }
  }

  blurSearchInput() {
    if (this.hasSearchInputTarget && document.activeElement === this.searchInputTarget) {
      this.searchInputTarget.blur()
    }
  }

  scrollSelectedRowIntoView() {
    if (!this.hasListTarget || !this.hasNativeSelectTarget) return

    const selectedValue = String(this.nativeSelectTarget.value || "")
    if (selectedValue === "") {
      this.listTarget.scrollTo({ top: 0, behavior: "auto" })
      return
    }

    const selectedRow = this.rowTargets.find((row) => String(row.dataset.value || "") === selectedValue && !row.hidden)
    if (!selectedRow) return

    selectedRow.scrollIntoView({ block: "nearest", inline: "nearest" })
  }

  lockBodyScroll() {
    if (!this.isMobile()) return
    if (document.body.dataset.categoryPickerScrollLocked === "true") return

    const scrollY = window.scrollY || window.pageYOffset || 0
    document.documentElement.classList.add("category-picker-sheet-open")
    document.body.classList.add("category-picker-sheet-open")
    document.body.dataset.categoryPickerScrollLocked = "true"
    document.body.dataset.categoryPickerScrollY = String(scrollY)
    document.body.style.top = `-${scrollY}px`
    document.body.style.position = "fixed"
    document.body.style.left = "0"
    document.body.style.right = "0"
    document.body.style.width = "100%"
  }

  unlockBodyScroll() {
    if (document.body.dataset.categoryPickerScrollLocked !== "true") return

    const scrollY = Number.parseInt(document.body.dataset.categoryPickerScrollY || "0", 10) || 0
    document.documentElement.classList.remove("category-picker-sheet-open")
    document.body.classList.remove("category-picker-sheet-open")
    delete document.body.dataset.categoryPickerScrollLocked
    delete document.body.dataset.categoryPickerScrollY
    document.body.style.removeProperty("top")
    document.body.style.removeProperty("position")
    document.body.style.removeProperty("left")
    document.body.style.removeProperty("right")
    document.body.style.removeProperty("width")
    window.scrollTo(0, scrollY)
  }
}
