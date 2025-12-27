import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = [
    "search",
    "row",
    "checkbox",
    "selectAll",
    "count",
    "openBulk",
    "modal",
    "recipientInputs",
    "recipientSummary",
    "bulkBody",
    "bulkSend",
    "allWarning",
    "bulkForm"
  ]

  connect() {
    this.total = this.checkboxTargets.length
    this.closeModal()
    this.updateCount()
    this.boundKeydown = this.keydown.bind(this)
    document.addEventListener("keydown", this.boundKeydown)
  }

  filter() {
    const q = (this.hasSearchTarget ? this.searchTarget.value.toLowerCase().trim() : "")
    this.rowTargets.forEach((row) => {
      const text = (row.dataset.search || "").toLowerCase()
      const match = q === "" || text.includes(q)
      row.classList.toggle("is-hidden", !match)
    })
    this.syncSelectAll()
    this.updateCount()
  }

  toggleAll(event) {
    const checked = event.currentTarget.checked
    this.visibleCheckboxes().forEach((cb) => (cb.checked = checked))
    this.updateCount()
  }

  updateCount() {
    const selected = this.selectedCheckboxes()
    const count = selected.length
    if (this.hasCountTarget) {
      this.countTarget.textContent = `${count} selected`
    }
    if (this.hasOpenBulkTarget) {
      this.openBulkTarget.disabled = count === 0
    }
    this.rowTargets.forEach((row) => {
      const cb = row.querySelector("input[type='checkbox']")
      row.classList.toggle("selected", cb?.checked)
    })
    this.syncSelectAll()
  }

  syncSelectAll() {
    if (!this.hasSelectAllTarget) return
    const visible = this.visibleCheckboxes()
    const allVisibleChecked = visible.length > 0 && visible.every((cb) => cb.checked)
    this.selectAllTarget.checked = allVisibleChecked
  }

  openBulkSelected() {
    const ids = this.selectedCheckboxes().map((cb) => parseInt(cb.dataset.subscriberId, 10))
    if (ids.length === 0) return
    const emails = ids.map((id) => {
      const row = this.rowTargets.find((r) => parseInt(r.dataset.subscriberId, 10) === id)
      return row?.querySelector(".subscriber-name")?.textContent?.trim() || "Subscriber"
    })
    this.openModal(ids, emails)
  }

  openSingle(event) {
    const id = parseInt(event.currentTarget.dataset.studentId, 10)
    const email = event.currentTarget.dataset.studentEmail
    this.openModal([id], [email])
  }

  openModal(ids, emails) {
    if (!this.hasModalTarget) return
    this.modalTarget.hidden = false
    document.body.style.overflow = "hidden"
    if (this.hasRecipientInputsTarget) {
      this.recipientInputsTarget.innerHTML = ""
      ids.forEach((id) => {
        const input = document.createElement("input")
        input.type = "hidden"
        input.name = "recipient_ids[]"
        input.value = id
        this.recipientInputsTarget.appendChild(input)
      })
    }
    if (this.hasRecipientSummaryTarget) {
      const parts = []
      emails.slice(0, 2).forEach((email) => parts.push(`<span class="chip">${email}</span>`))
      if (emails.length > 2) parts.push(`<span class="chip">+${emails.length - 2} more</span>`)
      this.recipientSummaryTarget.innerHTML = parts.join(" ")
    }
    if (this.hasAllWarningTarget) {
      this.allWarningTarget.style.display = ids.length === this.total ? "block" : "none"
    }
    if (this.hasBulkBodyTarget) {
      this.bulkBodyTarget.value = ""
    }
    if (this.hasBulkSendTarget) {
      this.bulkSendTarget.disabled = true
    }
    this.bulkBodyTarget?.focus()
  }

  closeModal() {
    if (!this.hasModalTarget) return
    this.modalTarget.hidden = true
    document.body.style.overflow = ""
  }

  validateBody() {
    if (!this.hasBulkSendTarget || !this.hasBulkBodyTarget) return
    this.bulkSendTarget.disabled = this.bulkBodyTarget.value.trim() === ""
  }

  backdrop(e) {
    if (e.target === this.modalTarget) this.closeModal()
  }

  keydown(e) {
    if (e.key === "Escape" && !this.modalTarget.hidden) this.closeModal()
  }

  visibleCheckboxes() {
    return this.checkboxTargets.filter((cb) => {
      const row = cb.closest("[data-subscribers-target='row']")
      if (!row) return true
      return !row.classList.contains("is-hidden")
    })
  }

  selectedCheckboxes() {
    return this.checkboxTargets.filter((cb) => cb.checked)
  }

  disconnect() {
    if (this.boundKeydown) document.removeEventListener("keydown", this.boundKeydown)
  }
}
