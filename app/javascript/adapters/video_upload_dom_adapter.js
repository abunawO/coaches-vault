function submitButtons(form) {
  return Array.from(form.querySelectorAll("button[type='submit'], input[type='submit']"));
}

export function disableSubmit(form, text = "Uploading…") {
  submitButtons(form).forEach((btn) => {
    if (!btn.dataset.originalText) btn.dataset.originalText = btn.textContent || btn.value;
    btn.disabled = true;
    if (btn.tagName === "BUTTON") btn.textContent = text;
    if (btn.tagName === "INPUT") btn.value = text;
  });
}

export function enableSubmit(form) {
  submitButtons(form).forEach((btn) => {
    btn.disabled = false;
    if (btn.dataset.originalText) {
      if (btn.tagName === "BUTTON") btn.textContent = btn.dataset.originalText;
      if (btn.tagName === "INPUT") btn.value = btn.dataset.originalText;
    }
  });
}

export class VideoUploadDomAdapter {
  constructor(input) {
    this.input = input;
  }

  get form() {
    return this.input.closest("form");
  }

  ensureStatusElement() {
    const host = this.input.closest("[data-slide-row]") || this.input.parentElement;
    if (!host) return null;
    let status = host.querySelector("[data-upload-status]");
    if (!status) {
      status = document.createElement("div");
      status.dataset.uploadStatus = "true";
      status.className = "upload-status";
      host.appendChild(status);
    }
    return status;
  }

  ensureProgressElement() {
    const host = this.input.closest("[data-slide-row]") || this.input.parentElement;
    if (!host) return null;
    let progress = host.querySelector("[data-upload-progress]");
    if (!progress) {
      progress = document.createElement("div");
      progress.dataset.uploadProgress = "true";
      progress.className = "upload-progress";
      progress.hidden = true;
      progress.setAttribute("role", "progressbar");
      progress.setAttribute("aria-label", "Video upload progress");
      progress.setAttribute("aria-valuemin", "0");
      progress.setAttribute("aria-valuemax", "100");
      progress.style.display = "block";
      progress.style.width = "100%";
      progress.style.height = "8px";
      progress.style.margin = "6px 0 4px";
      progress.style.borderRadius = "999px";
      progress.style.background = "#e5e7eb";
      progress.style.overflow = "hidden";

      const fill = document.createElement("div");
      fill.dataset.uploadProgressFill = "true";
      fill.style.width = "0%";
      fill.style.height = "100%";
      fill.style.background = "linear-gradient(90deg, #2563eb, #3b82f6)";
      fill.style.transition = "width 160ms ease";
      progress.appendChild(fill);

      const status = this.ensureStatusElement();
      if (status && status.parentElement === host) {
        status.insertAdjacentElement("beforebegin", progress);
      } else {
        host.appendChild(progress);
      }
    }
    return progress;
  }

  ensureHiddenField() {
    const existing = this.input.closest("[data-slide-row]")?.querySelector("[data-video-signed-id]");
    if (existing) return existing;

    const hidden = document.createElement("input");
    hidden.type = "hidden";
    hidden.dataset.videoSignedId = "true";
    this.input.insertAdjacentElement("afterend", hidden);
    return hidden;
  }

  preventRawFileSubmit(options = {}) {
    const clearValue = options.clearValue !== false;
    const keepDisabled = options.keepDisabled === true;
    if (this.input.name && !this.input.dataset.multipartOriginalName) {
      this.input.dataset.multipartOriginalName = this.input.name;
    }
    this.input.removeAttribute("name");
    this.input.disabled = keepDisabled;
    if (clearValue) {
      try {
        this.input.value = "";
      } catch (_e) {}
    }
  }

  setStatus(text) {
    const statusEl = this.ensureStatusElement();
    if (statusEl) statusEl.textContent = text;
  }

  showUploadProgress(percent = null) {
    const progressEl = this.ensureProgressElement();
    if (!progressEl) return;
    progressEl.hidden = false;
    const fillEl = progressEl.querySelector("[data-upload-progress-fill]");
    if (typeof percent === "number" && Number.isFinite(percent)) {
      const clamped = Math.max(0, Math.min(100, percent));
      progressEl.dataset.uploadPercent = String(Math.round(clamped));
      progressEl.setAttribute("aria-valuenow", String(Math.round(clamped)));
      if (fillEl) fillEl.style.width = `${clamped}%`;
    } else {
      progressEl.dataset.uploadPercent = "";
      progressEl.removeAttribute("aria-valuenow");
      if (fillEl) fillEl.style.width = "12%";
    }
  }

  hideUploadProgress() {
    const progressEl = this.ensureProgressElement();
    if (!progressEl) return;
    progressEl.hidden = true;
    progressEl.dataset.uploadPercent = "";
    progressEl.removeAttribute("aria-valuenow");
    const fillEl = progressEl.querySelector("[data-upload-progress-fill]");
    if (fillEl) fillEl.style.width = "0%";
  }

  resolveOriginalInputName(hiddenField = null) {
    const directName = this.input.getAttribute("name");
    if (directName) {
      this.input.dataset.multipartOriginalName = directName;
      return directName;
    }

    const cachedName = this.input.dataset?.multipartOriginalName;
    if (cachedName) return cachedName;

    const hidden = hiddenField || this.ensureHiddenField();
    const hiddenName = hidden?.name;
    if (hiddenName) return hiddenName;

    const row = this.input.closest?.("[data-slide-row]");
    const rowVideoInput = row?.querySelector?.("[data-video-multipart-upload='true']");
    const rowName = rowVideoInput?.getAttribute("name");
    if (rowName) {
      this.input.dataset.multipartOriginalName = rowName;
      return rowName;
    }

    return null;
  }

  setHiddenSignedId(hiddenField, signedId, originalName) {
    if (!hiddenField) return;
    hiddenField.value = signedId || "";
    hiddenField.name = originalName || "";
  }

  clearHiddenSignedId(hiddenField) {
    if (!hiddenField) return;
    hiddenField.value = "";
    hiddenField.name = "";
  }

  focusAndScroll() {
    this.input.focus();
    this.input.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}
