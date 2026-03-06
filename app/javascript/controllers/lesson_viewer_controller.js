import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = [
    "carousel",
    "frame",
    "track",
    "slide",
    "dot",
    "stepButton",
    "counterCurrent",
    "counterTotal",
    "currentKind",
    "aboutBody",
    "aboutToggle"
  ]

  connect() {
    this.index = this.slideTargets.findIndex((el) => el.classList.contains("is-active"))
    if (this.index < 0) this.index = 0

    this.pointerDownHandler = this.onPointerDown.bind(this)
    this.pointerMoveHandler = this.onPointerMove.bind(this)
    this.pointerUpHandler = this.onPointerUp.bind(this)

    if (this.hasTrackTarget) {
      this.trackTarget.addEventListener("pointerdown", this.pointerDownHandler)
      this.trackTarget.addEventListener("pointermove", this.pointerMoveHandler)
      this.trackTarget.addEventListener("pointerup", this.pointerUpHandler)
      this.trackTarget.addEventListener("pointerleave", this.pointerUpHandler)
      this.trackTarget.addEventListener("touchstart", this.pointerDownHandler, { passive: true })
      this.trackTarget.addEventListener("touchmove", this.pointerMoveHandler, { passive: true })
      this.trackTarget.addEventListener("touchend", this.pointerUpHandler)
    }

    this.startX = 0
    this.currentX = 0
    this.isDragging = false
    this.swipeThreshold = 50

    this.setupAboutToggle()
    this.update()
    this.unloadEmbedsExcept(this.index)
  }

  disconnect() {
    if (this.aboutResizeObserver) {
      this.aboutResizeObserver.disconnect()
      this.aboutResizeObserver = null
    }

    if (!this.hasTrackTarget) return
    this.trackTarget.removeEventListener("pointerdown", this.pointerDownHandler)
    this.trackTarget.removeEventListener("pointermove", this.pointerMoveHandler)
    this.trackTarget.removeEventListener("pointerup", this.pointerUpHandler)
    this.trackTarget.removeEventListener("pointerleave", this.pointerUpHandler)
    this.trackTarget.removeEventListener("touchstart", this.pointerDownHandler)
    this.trackTarget.removeEventListener("touchmove", this.pointerMoveHandler)
    this.trackTarget.removeEventListener("touchend", this.pointerUpHandler)
  }

  prev() {
    this.goTo(this.index - 1)
  }

  next() {
    this.goTo(this.index + 1)
  }

  goToDot(event) {
    const target = Number.parseInt(event.currentTarget.dataset.index || "0", 10)
    if (Number.isInteger(target)) this.goTo(target)
  }

  goToStep(event) {
    const target = Number.parseInt(event.currentTarget.dataset.index || "0", 10)
    if (Number.isInteger(target)) this.goTo(target)
  }

  loadEmbed(event) {
    const button = event.currentTarget
    if (!button || button.dataset.loaded === "true") return

    const embed = button.dataset.videoEmbed
    if (!embed) return

    const frame = button.closest(".player-frame")
    if (!frame) return

    const provider = button.dataset.videoProvider || ""
    const separator = embed.includes("?") ? "&" : "?"
    const params = provider === "youtube" ? "autoplay=1&playsinline=1&rel=0" : "autoplay=1"

    const iframe = document.createElement("iframe")
    iframe.src = `${embed}${separator}${params}`
    iframe.title = "Video player"
    iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
    iframe.allowFullscreen = true
    iframe.setAttribute("frameborder", "0")
    iframe.loading = "lazy"
    iframe.referrerPolicy = "strict-origin-when-cross-origin"

    if (!frame.dataset.posterHtml) {
      frame.dataset.posterHtml = frame.innerHTML
    }

    button.dataset.loaded = "true"
    frame.replaceChildren(iframe)
  }

  playInlineVideo(event) {
    const overlay = event.currentTarget
    const media = overlay.closest(".lesson-carousel__media--video")
    const video = media?.querySelector("[data-inline-video]")
    if (!video) return

    overlay.style.display = "none"
    video.setAttribute("controls", "controls")
    video.play().catch(() => {
      overlay.style.display = ""
    })

    video.addEventListener("play", () => {
      overlay.style.display = "none"
    }, { once: true })

    video.addEventListener("ended", () => {
      overlay.style.display = ""
    })
  }

  toggleAbout() {
    if (!this.hasAboutBodyTarget || !this.hasAboutToggleTarget) return

    this.aboutBodyTarget.classList.toggle("about-collapsed")
    const isCollapsed = this.aboutBodyTarget.classList.contains("about-collapsed")
    this.aboutToggleTarget.textContent = isCollapsed ? "Show more" : "Show less"
  }

  goTo(nextIndex) {
    if (!this.hasSlideTarget || this.slideTargets.length === 0) return

    const total = this.slideTargets.length
    this.index = (nextIndex + total) % total
    this.update()
    this.unloadEmbedsExcept(this.index)
  }

  update() {
    if (this.hasTrackTarget) {
      this.trackTarget.style.transform = `translateX(-${this.index * 100}%)`
      this.trackTarget.style.transition = "transform 0.35s ease"
    }

    this.slideTargets.forEach((slide, idx) => {
      slide.classList.toggle("is-active", idx === this.index)
    })

    if (this.hasDotTarget) {
      this.dotTargets.forEach((dot, idx) => {
        dot.classList.toggle("is-active", idx === this.index)
      })
    }

    if (this.hasStepButtonTarget) {
      this.stepButtonTargets.forEach((button, idx) => {
        button.classList.toggle("is-active", idx === this.index)
      })
    }

    if (this.hasCounterCurrentTarget) {
      this.counterCurrentTarget.textContent = String(this.index + 1)
    }

    if (this.hasCounterTotalTarget) {
      this.counterTotalTarget.textContent = String(this.slideTargets.length)
    }

    if (this.hasCurrentKindTarget) {
      const kind = this.slideTargets[this.index]?.dataset.kind || "media"
      this.currentKindTarget.textContent = this.humanKind(kind)
    }
  }

  setupAboutToggle() {
    if (!this.hasAboutBodyTarget || !this.hasAboutToggleTarget) return

    const evaluateOverflow = () => {
      const wasCollapsed = this.aboutBodyTarget.classList.contains("about-collapsed")
      if (!wasCollapsed) this.aboutBodyTarget.classList.add("about-collapsed")

      const needsToggle = this.aboutBodyTarget.scrollHeight > this.aboutBodyTarget.clientHeight + 1

      if (!wasCollapsed) this.aboutBodyTarget.classList.remove("about-collapsed")

      if (!needsToggle) {
        this.aboutBodyTarget.classList.remove("about-collapsed")
        this.aboutToggleTarget.classList.add("is-hidden")
        this.aboutToggleTarget.textContent = ""
        return
      }

      this.aboutToggleTarget.classList.remove("is-hidden")
      this.aboutToggleTarget.textContent = this.aboutBodyTarget.classList.contains("about-collapsed") ? "Show more" : "Show less"
    }

    evaluateOverflow()

    if (window.ResizeObserver) {
      this.aboutResizeObserver = new ResizeObserver(evaluateOverflow)
      this.aboutResizeObserver.observe(this.aboutBodyTarget)
    }
  }

  unloadEmbedsExcept(activeIndex) {
    this.slideTargets.forEach((slide, idx) => {
      if (idx === activeIndex) return
      const frame = slide.querySelector(".player-frame")
      if (!frame) return

      const iframe = frame.querySelector("iframe")
      if (iframe && frame.dataset.posterHtml) {
        frame.innerHTML = frame.dataset.posterHtml
        const button = frame.querySelector(".video-poster")
        if (button) button.dataset.loaded = "false"
      }
    })
  }

  onPointerDown(event) {
    if (!this.hasTrackTarget) return

    this.isDragging = true
    this.startX = event.clientX || event.touches?.[0]?.clientX || 0
    this.currentX = this.startX
    this.trackTarget.style.transition = "none"
  }

  onPointerMove(event) {
    if (!this.isDragging || !this.hasTrackTarget) return

    const x = event.clientX || event.touches?.[0]?.clientX || 0
    this.currentX = x
    const delta = this.currentX - this.startX
    this.trackTarget.style.transform = `translateX(calc(-${this.index * 100}% + ${delta}px))`
  }

  onPointerUp() {
    if (!this.isDragging || !this.hasTrackTarget) return

    this.isDragging = false
    const delta = this.currentX - this.startX

    if (Math.abs(delta) > this.swipeThreshold) {
      if (delta < 0) this.goTo(this.index + 1)
      else this.goTo(this.index - 1)
      return
    }

    this.update()
  }

  humanKind(kind) {
    if (kind === "image") return "Image step"
    if (kind === "video") return "Video step"
    return "Media step"
  }
}
