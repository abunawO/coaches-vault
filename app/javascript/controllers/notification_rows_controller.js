import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["confirm"]

  confirm(event) {
    event.preventDefault()
    event.stopPropagation()

    this.hideAll()
    const id = event.currentTarget.dataset.notificationId
    const confirm = this.confirmTargets.find((el) => el.dataset.notificationId === id)
    if (confirm) confirm.classList.add("is-active")
  }

  cancel(event) {
    event.preventDefault()
    this.hideAll()
  }

  hideAll() {
    this.confirmTargets.forEach((el) => el.classList.remove("is-active"))
  }
}
