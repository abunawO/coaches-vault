import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["menu", "toggle", "moreWrap", "moreMenu", "desktopLinks"]

  connect() {
    this.handleOutsideClick = this.handleOutsideClick.bind(this)
    this.handleKeydown = this.handleKeydown.bind(this)
    this.listenersAttached = false
  }

  disconnect() {
    this.cleanup()
  }

  toggle() {
    const isOpen = this.element.classList.toggle("topnav--mobile-open")
    this.toggleTarget.setAttribute("aria-expanded", isOpen ? "true" : "false")
    document.body.classList.toggle("nav-open", isOpen)
    if (isOpen) this.menuTarget.focus?.()
    this.updateGlobalHandlers()
  }

  toggleMore(event) {
    event?.preventDefault()
    const button = event?.currentTarget
    const isOpen = !this.moreMenuTarget.hidden
    if (isOpen) {
      this.closeMore(button)
    } else {
      this.moreMenuTarget.hidden = false
      button?.setAttribute("aria-expanded", "true")
      this.updateGlobalHandlers()
    }
  }

  close() {
    if (this.element.classList.contains("topnav--mobile-open")) {
      this.element.classList.remove("topnav--mobile-open")
      this.toggleTarget.setAttribute("aria-expanded", "false")
      document.body.classList.remove("nav-open")
    }
    this.updateGlobalHandlers()
  }

  closeMore(button = null) {
    if (!this.hasMoreMenuTarget || this.moreMenuTarget.hidden) return
    this.moreMenuTarget.hidden = true
    const btn = button || this.moreWrapTarget?.querySelector(".topnav__moreBtn")
    btn?.setAttribute("aria-expanded", "false")
    this.updateGlobalHandlers()
  }

  updateGlobalHandlers() {
    const needsListeners =
      this.element.classList.contains("topnav--mobile-open") ||
      (this.hasMoreMenuTarget && !this.moreMenuTarget.hidden)

    if (needsListeners && !this.listenersAttached) {
      document.addEventListener("click", this.handleOutsideClick)
      document.addEventListener("keydown", this.handleKeydown)
      this.listenersAttached = true
    } else if (!needsListeners && this.listenersAttached) {
      this.cleanup()
    }
  }

  cleanup() {
    document.removeEventListener("click", this.handleOutsideClick)
    document.removeEventListener("keydown", this.handleKeydown)
    this.listenersAttached = false
  }

  handleOutsideClick(event) {
    if (!this.element.contains(event.target)) {
      this.close()
      this.closeMore()
      return
    }

    if (this.hasMoreMenuTarget && !this.moreMenuTarget.hidden && !this.moreWrapTarget.contains(event.target)) {
      this.closeMore()
    }
  }

  handleKeydown(event) {
    if (event.key === "Escape") {
      this.close()
      this.closeMore()
    }
  }
}
