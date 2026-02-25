const csrfToken = () => document.querySelector("meta[name='csrf-token']")?.content;

function perfNowMs() {
  try {
    if (globalThis.performance && typeof globalThis.performance.now === "function") {
      return globalThis.performance.now();
    }
  } catch (_e) {}
  return Date.now();
}

function uploadPerfEnabled() {
  try {
    return new URLSearchParams(window.location.search).get("debug_upload_perf") === "1";
  } catch (_e) {
    return false;
  }
}

function debugUploadPerf(...args) {
  if (!uploadPerfEnabled()) return;
  console.debug("[upload-perf]", ...args);
}

function makeUploadTraceId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function timedPostJson(path, payload, options = {}) {
  const startedAt = perfNowMs();
  return postJson(path, payload, options)
    .then((data) => {
      if (typeof options.onComplete === "function") {
        options.onComplete({ ok: true, ms: perfNowMs() - startedAt, data });
      }
      return data;
    })
    .catch((error) => {
      if (typeof options.onComplete === "function") {
        options.onComplete({ ok: false, ms: perfNowMs() - startedAt, error });
      }
      throw error;
    });
}

function normalizeCompletedParts(parts) {
  return (Array.isArray(parts) ? parts : [])
    .map((p) => ({
      part_number: p?.partNumber ?? p?.PartNumber ?? p?.part_number,
      etag: p?.etag ?? p?.ETag ?? p?.eTag
    }))
    .map((p) => ({
      part_number: p.part_number == null ? null : Number(p.part_number),
      etag: typeof p.etag === "string" ? p.etag : null
    }))
    .filter((p) => Number.isInteger(p.part_number) && p.part_number > 0 && p.etag);
}

async function postJson(path, payload, options = {}) {
  const extraHeaders = options.headers || {};
  const response = await fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-Token": csrfToken(),
      ...extraHeaders
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const contentType = response.headers.get("content-type") || "";
    const rawBody = await response.text();

    if (contentType.includes("application/json")) {
      try {
        const json = JSON.parse(rawBody);
        const message = json?.error || json?.message;
        throw new Error(message || `Request failed (${response.status})`);
      } catch (_parseError) {
        throw new Error(`Request failed (${response.status})`);
      }
    }

    if (/<(?:!DOCTYPE\s+html|html)\b/i.test(rawBody)) {
      // eslint-disable-next-line no-console
      console.error("[multipart] Non-JSON error response", { path, status: response.status, body: rawBody.slice(0, 2000) });
      throw new Error(`Upload service error (${response.status}). Please retry. If it persists, check server logs.`);
    }

    throw new Error(rawBody || `Request failed (${response.status})`);
  }

  if (response.status === 204) return null;
  const body = await response.text();
  if (!body) return null;
  return JSON.parse(body);
}

function ensureStatusElement(input) {
  const host = input.closest("[data-slide-row]") || input.parentElement;
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

function ensureProgressElement(input) {
  const host = input.closest("[data-slide-row]") || input.parentElement;
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

    const status = ensureStatusElement(input);
    if (status && status.parentElement === host) {
      status.insertAdjacentElement("beforebegin", progress);
    } else {
      host.appendChild(progress);
    }
  }
  return progress;
}

function ensureHiddenField(input) {
  const existing = input.closest("[data-slide-row]")?.querySelector("[data-video-signed-id]");
  if (existing) return existing;

  const hidden = document.createElement("input");
  hidden.type = "hidden";
  hidden.dataset.videoSignedId = "true";
  input.insertAdjacentElement("afterend", hidden);
  return hidden;
}

function preventRawFileSubmit(input, options = {}) {
  if (!input) return;
  const clearValue = options.clearValue !== false;
  const keepDisabled = options.keepDisabled === true;
  if (input.name && !input.dataset.multipartOriginalName) {
    input.dataset.multipartOriginalName = input.name;
  }
  input.removeAttribute("name");
  input.disabled = keepDisabled;
  if (clearValue) {
    try {
      input.value = "";
    } catch (_e) {}
  }
}

function setStatus(statusEl, text) {
  if (statusEl) statusEl.textContent = text;
}

function showUploadProgress(input, percent = null) {
  const progressEl = ensureProgressElement(input);
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

function hideUploadProgress(input) {
  const progressEl = ensureProgressElement(input);
  if (!progressEl) return;
  progressEl.hidden = true;
  progressEl.dataset.uploadPercent = "";
  progressEl.removeAttribute("aria-valuenow");
  const fillEl = progressEl.querySelector("[data-upload-progress-fill]");
  if (fillEl) fillEl.style.width = "0%";
}

function formatMultipartUploadError(error) {
  const raw = error?.message || String(error || "");
  const msg = String(raw || "").trim();
  const lower = msg.toLowerCase();

  if (
    msg === "Unknown error" ||
    lower.includes("networkerror") ||
    lower.includes("failed to fetch") ||
    lower.includes("connection reset") ||
    lower.includes("xhr error")
  ) {
    return "Connection to storage was interrupted. Please retry (VPN/extensions can cause this).";
  }

  return msg || "Unknown error";
}

function resolveOriginalInputName(input, hiddenField) {
  const directName = input?.getAttribute("name");
  if (directName) {
    input.dataset.multipartOriginalName = directName;
    return directName;
  }

  const cachedName = input?.dataset?.multipartOriginalName;
  if (cachedName) return cachedName;

  const hiddenName = hiddenField?.name;
  if (hiddenName) return hiddenName;

  const row = input?.closest?.("[data-slide-row]");
  const rowVideoInput = row?.querySelector?.("[data-video-multipart-upload='true']");
  const rowName = rowVideoInput?.getAttribute("name");
  if (rowName) {
    input.dataset.multipartOriginalName = rowName;
    return rowName;
  }

  return null;
}

const uploadState = new WeakMap();
function setState(input, state, signedId = null) {
  const current = uploadState.get(input) || {};
  uploadState.set(input, { ...current, state, signedId });
}

function getState(input) {
  return uploadState.get(input) || { state: "idle", signedId: null };
}

function submitButtons(form) {
  return Array.from(form.querySelectorAll("button[type='submit'], input[type='submit']"));
}

function disableSubmit(form, text = "Uploading…") {
  submitButtons(form).forEach((btn) => {
    if (!btn.dataset.originalText) btn.dataset.originalText = btn.textContent || btn.value;
    btn.disabled = true;
    if (btn.tagName === "BUTTON") btn.textContent = text;
    if (btn.tagName === "INPUT") btn.value = text;
  });
}

function enableSubmit(form) {
  submitButtons(form).forEach((btn) => {
    btn.disabled = false;
    if (btn.dataset.originalText) {
      if (btn.tagName === "BUTTON") btn.textContent = btn.dataset.originalText;
      if (btn.tagName === "INPUT") btn.value = btn.dataset.originalText;
    }
  });
}

function hasPendingMultipartUploads(form) {
  if (!form) return false;
  const inputs = Array.from(form.querySelectorAll("[data-video-multipart-upload='true']"));
  return inputs.some((input) => {
    const { state, signedId } = getState(input);
    const hasFile = (input.files?.length || 0) > 0;
    if (state === "queued" || state === "uploading") return true;
    if (hasFile && (state !== "complete" || !signedId)) return true;
    return false;
  });
}

function syncSubmitDisabledForMultipart(form) {
  if (!form) return;
  if (hasPendingMultipartUploads(form)) {
    disableSubmit(form, "Uploading…");
  } else {
    enableSubmit(form);
  }
}

const MULTIPART_CHUNK_SIZE_BYTES = 15 * 1024 * 1024;
const MAX_ACTIVE_UPLOADS = 2;
let activeUploadSlots = 0;
const uploadSlotWaiters = [];

async function acquireUploadSlot() {
  if (activeUploadSlots < MAX_ACTIVE_UPLOADS) {
    activeUploadSlots += 1;
    return makeSlotReleaser();
  }

  return new Promise((resolve) => {
    uploadSlotWaiters.push(() => {
      activeUploadSlots += 1;
      resolve(makeSlotReleaser());
    });
  });
}

function makeSlotReleaser() {
  let released = false;
  return function releaseUploadSlot() {
    if (released) return;
    released = true;
    activeUploadSlots = Math.max(0, activeUploadSlots - 1);
    const next = uploadSlotWaiters.shift();
    if (next) next();
  };
}

function buildPerfSummary(metrics, status) {
  if (!metrics) return null;
  const signCount = metrics.sign_part_count || 0;
  const signTotal = metrics.sign_part_ms_total || 0;
  return {
    status,
    trace_id: metrics.trace_id,
    file_name: metrics.file_name,
    file_size: metrics.file_size,
    mime: metrics.mime,
    input_name: metrics.input_name,
    chunk_size_bytes: MULTIPART_CHUNK_SIZE_BYTES,
    max_active_uploads: MAX_ACTIVE_UPLOADS,
    queue_wait_ms: metrics.queue_wait_ms != null ? Math.round(metrics.queue_wait_ms) : null,
    upload_total_ms: metrics.upload_total_ms != null ? Math.round(metrics.upload_total_ms) : null,
    create_ms: metrics.create_ms != null ? Math.round(metrics.create_ms) : null,
    sign_part_count: signCount,
    sign_part_ms_total: Math.round(signTotal),
    sign_part_ms_avg: signCount > 0 ? Math.round(signTotal / signCount) : null,
    complete_ms: metrics.complete_ms != null ? Math.round(metrics.complete_ms) : null,
    parts_count: metrics.parts_count != null ? metrics.parts_count : null
  };
}

let warnedFallback = false;
function warnFallbackOnce(error) {
  if (warnedFallback) return;
  warnedFallback = true;
  // eslint-disable-next-line no-console
  console.warn("Multipart video uploader failed to initialize; falling back to normal form upload.", error);
}

function debugMultipart(...args) {
  try {
    if (new URLSearchParams(window.location.search).get("debug_lesson_form") !== "1") return;
  } catch (_e) {
    return;
  }
  console.debug("[multipart]", ...args);
}

let uppyModulesPromise;
async function loadUppy() {
  if (!uppyModulesPromise) {
    uppyModulesPromise = import("uppy_bundle").then((bundled) => {
      if (bundled?.Uppy && bundled?.AwsS3Multipart) {
        return { Uppy: bundled.Uppy, AwsS3Multipart: bundled.AwsS3Multipart };
      }
      throw new Error("Local uppy_bundle is missing Uppy exports");
    });
  }
  return uppyModulesPromise;
}

async function applyUploader(input) {
  if (input.dataset.uploaderBound === "true") return;
  if (!resolveOriginalInputName(input, null)) {
    debugMultipart("defer uploader bind until input has name", { id: input.id || null });
    return;
  }

  try {
    const statusEl = ensureStatusElement(input);
    const hiddenField = ensureHiddenField(input);
    const form = input.closest("form");
    const { Uppy, AwsS3Multipart } = await loadUppy();
    let uploadRunToken = 0;
    let heldSlot = null;
    let currentOriginalName = resolveOriginalInputName(input, hiddenField);
    let currentPerfMetrics = null;

    const releaseHeldSlot = (token = null) => {
      if (!heldSlot) return;
      if (token !== null && heldSlot.token !== token) return;
      const releaser = heldSlot.release;
      heldSlot = null;
      releaser();
    };

    const logPerfSummary = (status, token, extras = {}) => {
      if (!currentPerfMetrics) return;
      if (token == null) return;
      if (currentPerfMetrics.token !== token) return;
      if (currentPerfMetrics.summaryLogged) return;
      currentPerfMetrics.summaryLogged = true;
      if (currentPerfMetrics.upload_started_at != null) {
        currentPerfMetrics.upload_total_ms = perfNowMs() - currentPerfMetrics.upload_started_at;
      }
      const summary = buildPerfSummary({ ...currentPerfMetrics, ...extras }, status);
      if (summary) debugUploadPerf(summary);
      currentPerfMetrics = null;
    };

    const uppy = new Uppy({
      autoProceed: false,
      allowMultipleUploadBatches: false,
      restrictions: { maxNumberOfFiles: 1, allowedFileTypes: ["video/mp4", "video/quicktime"] }
    });

    uppy.use(AwsS3Multipart, {
      // Reduce concurrent S3 PUTs to improve reliability on flaky local networks/VPNs.
      limit: 1,
      // Uppy aws-s3-multipart (v3.x) supports getChunkSize(file); set 15 MiB to reduce sign_part overhead.
      getChunkSize: () => MULTIPART_CHUNK_SIZE_BYTES,
      createMultipartUpload: (file) =>
        timedPostJson(
          "/s3/multipart/create",
          {
            filename: file.name,
            content_type: file.type,
            byte_size: file.size,
            checksum: file.meta?.checksum
          },
          {
            headers: currentPerfMetrics?.trace_id ? { "X-Upload-Trace": currentPerfMetrics.trace_id } : {},
            onComplete: ({ ms }) => {
              if (currentPerfMetrics) currentPerfMetrics.create_ms = ms;
            }
          }
        ).then((data) => {
          file.meta.uploadId = data.upload_id;
          file.meta.key = data.key;
          return { uploadId: data.upload_id, key: data.key, bucket: data.bucket, region: data.region };
        }),
      signPart: (file, { uploadId, key, partNumber }) =>
        timedPostJson(
          "/s3/multipart/sign_part",
          {
            upload_id: uploadId,
            key: key,
            part_number: partNumber
          },
          {
            headers: currentPerfMetrics?.trace_id ? { "X-Upload-Trace": currentPerfMetrics.trace_id } : {},
            onComplete: ({ ms }) => {
              if (!currentPerfMetrics) return;
              currentPerfMetrics.sign_part_count = (currentPerfMetrics.sign_part_count || 0) + 1;
              currentPerfMetrics.sign_part_ms_total = (currentPerfMetrics.sign_part_ms_total || 0) + ms;
            }
          }
        ),
      completeMultipartUpload: (file, { uploadId, key, parts }) =>
        timedPostJson(
          "/s3/multipart/complete",
          {
            upload_id: uploadId,
            key: key,
            filename: file.name,
            content_type: file.type,
            byte_size: file.size,
            checksum: file.meta?.checksum,
            parts: normalizeCompletedParts(parts)
          },
          {
            headers: currentPerfMetrics?.trace_id ? { "X-Upload-Trace": currentPerfMetrics.trace_id } : {},
            onComplete: ({ ms }) => {
              if (!currentPerfMetrics) return;
              currentPerfMetrics.complete_ms = ms;
              currentPerfMetrics.parts_count = Array.isArray(parts) ? parts.length : null;
            }
          }
        ),
      abortMultipartUpload: (file, uploadData) =>
        timedPostJson(
          "/s3/multipart/abort",
          {
            upload_id: uploadData?.uploadId || file?.meta?.uploadId,
            key: uploadData?.key || file?.meta?.key
          },
          {
            headers: currentPerfMetrics?.trace_id ? { "X-Upload-Trace": currentPerfMetrics.trace_id } : {}
          }
        )
    });

    uppy.on("progress", (progress) => {
      setState(input, "uploading");
      if (form) syncSubmitDisabledForMultipart(form);
      showUploadProgress(input, progress);
      setStatus(statusEl, `Uploading… ${Math.floor(progress)}%`);
    });

    uppy.on("upload-success", (_file, response) => {
      const signedId = response?.body?.signed_id;
      const originalName = currentOriginalName || resolveOriginalInputName(input, hiddenField);
      if (signedId && hiddenField) {
        if (!originalName) {
          setStatus(statusEl, "Missing input name; please reload and retry.");
          setState(input, "failed");
          if (form) enableSubmit(form);
          return;
        }
        hiddenField.value = signedId;
        hiddenField.name = originalName;
        preventRawFileSubmit(input);
      }
      setState(input, "complete", signedId);
      showUploadProgress(input, 100);
      setStatus(statusEl, "Upload complete");
      logPerfSummary("success", currentPerfMetrics?.token);
      if (form) syncSubmitDisabledForMultipart(form);
    });

    uppy.on("upload-error", (_file, error) => {
      setStatus(statusEl, `Upload failed: ${formatMultipartUploadError(error)}`);
      setState(input, "failed");
      hideUploadProgress(input);
      hiddenField.value = "";
      hiddenField.name = "";
      preventRawFileSubmit(input, { clearValue: false });
      logPerfSummary("error", currentPerfMetrics?.token);
      if (form) syncSubmitDisabledForMultipart(form);
    });

    uppy.on("error", (error) => {
      setStatus(statusEl, `Error: ${formatMultipartUploadError(error)}`);
      setState(input, "failed");
      hideUploadProgress(input);
      hiddenField.value = "";
      hiddenField.name = "";
      preventRawFileSubmit(input, { clearValue: false });
      logPerfSummary("error", currentPerfMetrics?.token);
      if (form) syncSubmitDisabledForMultipart(form);
    });

    uppy.on("cancel-all", () => {
      logPerfSummary("canceled", heldSlot?.token);
      releaseHeldSlot();
    });

    const startUploadForSelectedFile = async () => {
      const [file] = input.files || [];
      if (!file) {
        logPerfSummary("canceled", currentPerfMetrics?.token);
        const restoreName = currentOriginalName || resolveOriginalInputName(input, hiddenField);
        hiddenField.value = "";
        hiddenField.name = "";
        hideUploadProgress(input);
        if (restoreName && !input.dataset.multipartOriginalName) {
          input.dataset.multipartOriginalName = restoreName;
        }
        preventRawFileSubmit(input, { clearValue: false });
        setState(input, "idle", null);
        releaseHeldSlot();
        if (form) syncSubmitDisabledForMultipart(form);
        return;
      }

      uploadRunToken += 1;
      const thisRunToken = uploadRunToken;
      currentOriginalName = resolveOriginalInputName(input, hiddenField);
      if (!currentOriginalName) {
        setStatus(statusEl, "Missing input name; please reload and retry.");
        setState(input, "failed");
        currentPerfMetrics = null;
        if (form) syncSubmitDisabledForMultipart(form);
        return;
      }

      const previousPerfToken = currentPerfMetrics?.token;
      logPerfSummary("canceled", previousPerfToken);

      currentPerfMetrics = {
        token: thisRunToken,
        trace_id: uploadPerfEnabled() ? makeUploadTraceId() : null,
        file_name: file.name,
        file_size: file.size,
        mime: file.type,
        input_name: currentOriginalName,
        sign_part_count: 0,
        sign_part_ms_total: 0,
        create_ms: null,
        complete_ms: null,
        parts_count: null,
        queue_wait_ms: null,
        upload_total_ms: null,
        upload_started_at: null,
        summaryLogged: false
      };

      hiddenField.value = "";
      hiddenField.name = "";
      input.disabled = false;
      input.removeAttribute("name");
      releaseHeldSlot();

      uppy.cancelAll();
      setState(input, "queued");
      if (form) syncSubmitDisabledForMultipart(form);
      showUploadProgress(input);
      setStatus(statusEl, "Queued for upload…");

      let slotReleaser;
      const queueWaitStartedAt = perfNowMs();
      try {
        slotReleaser = await acquireUploadSlot();
        if (thisRunToken !== uploadRunToken) {
          slotReleaser();
          return;
        }

        heldSlot = { release: slotReleaser, token: thisRunToken };
        if (currentPerfMetrics && currentPerfMetrics.token === thisRunToken) {
          currentPerfMetrics.queue_wait_ms = perfNowMs() - queueWaitStartedAt;
          currentPerfMetrics.upload_started_at = perfNowMs();
        }
        setState(input, "uploading");
        if (form) syncSubmitDisabledForMultipart(form);
        showUploadProgress(input);
        setStatus(statusEl, "Starting upload…");

        uppy.addFile({
          name: file.name,
          type: file.type,
          data: file,
          meta: { checksum: null }
        });

        await uppy.upload();
      } catch (error) {
        setStatus(statusEl, `Upload failed: ${formatMultipartUploadError(error)}`);
        setState(input, "failed");
        hideUploadProgress(input);
        hiddenField.value = "";
        hiddenField.name = "";
        preventRawFileSubmit(input, { clearValue: false });
        logPerfSummary("error", thisRunToken);
        if (form) syncSubmitDisabledForMultipart(form);
      } finally {
        if (heldSlot && heldSlot.token === thisRunToken) {
          releaseHeldSlot(thisRunToken);
        } else if (slotReleaser) {
          slotReleaser();
        }
      }
    };

    input.addEventListener("change", () => {
      startUploadForSelectedFile().catch((error) => {
        setStatus(statusEl, `Upload failed: ${formatMultipartUploadError(error)}`);
        setState(input, "failed");
        hideUploadProgress(input);
        hiddenField.value = "";
        hiddenField.name = "";
        preventRawFileSubmit(input, { clearValue: false });
        if (form) enableSubmit(form);
      });
    });

    input.dataset.uploaderBound = "true";
    // Keep the file picker usable; removing `name` is what prevents form submission.
    preventRawFileSubmit(input, { clearValue: false });
    debugMultipart("bound input", { name: input.name });

    // If the user selected a file before Uppy finished binding, replay the missed change event.
    if ((input.files?.length || 0) > 0) {
      const { state } = getState(input);
      if (state === "idle") {
        setStatus(statusEl, "Preparing upload…");
        showUploadProgress(input);
        if (form) syncSubmitDisabledForMultipart(form);
        window.setTimeout(() => {
          if (!document.contains(input)) return;
          if ((input.files?.length || 0) === 0) return;
          const currentState = getState(input).state;
          if (currentState !== "idle") return;
          startUploadForSelectedFile().catch((error) => {
            setStatus(statusEl, `Upload failed: ${formatMultipartUploadError(error)}`);
            setState(input, "failed");
            hideUploadProgress(input);
            hiddenField.value = "";
            hiddenField.name = "";
            preventRawFileSubmit(input, { clearValue: false });
            if (form) enableSubmit(form);
          });
        }, 0);
      }
    }
  } catch (error) {
    warnFallbackOnce(error);
  }
}

export function initVideoMultipartUploads(root = document) {
  try {
    const scope = root && typeof root.querySelectorAll === "function" ? root : document;
    const inputs = Array.from(scope.querySelectorAll("[data-video-multipart-upload='true']"));
    if (inputs.length === 0) return;
    inputs.forEach((input) => applyUploader(input).catch((err) => warnFallbackOnce(err)));
    addFormGuards(inputs);
  } catch (error) {
    warnFallbackOnce(error);
  }
}

window.initVideoMultipartUploads ||= initVideoMultipartUploads;

function allUploadsReady(form) {
  const inputs = Array.from(form.querySelectorAll("[data-video-multipart-upload='true']"));
  return inputs.every((input) => {
    const { state, signedId } = getState(input);
    if (state === "failed") return false;
    if (state === "uploading") return false;
    if (input.files?.length && state !== "complete") return false;
    if (state === "complete" && !signedId) return false;
    return true;
  });
}

function addFormGuards(inputs) {
  inputs
    .map((input) => input.closest("form"))
    .filter(Boolean)
    .forEach((form) => {
      if (form.dataset.multipartSubmitGuard === "true") return;
      form.dataset.multipartSubmitGuard = "true";

      form.addEventListener("submit", (event) => {
        const videoInputs = Array.from(form.querySelectorAll("[data-video-multipart-upload='true']"));
        let block = false;

        videoInputs.forEach((input) => {
          const statusEl = ensureStatusElement(input);
          const { state, signedId } = getState(input);
          const hasFile = (input.files?.length || 0) > 0;
          const multipartEnabled = input.dataset.uploaderBound === "true";

          if (hasFile || multipartEnabled) {
            preventRawFileSubmit(input, { clearValue: false });
          }

          if (state === "failed") {
            block = true;
            setStatus(statusEl, "Video upload failed. Please retry the upload before saving.");
            input.focus();
            input.scrollIntoView({ behavior: "smooth", block: "center" });
            return;
          }

          if (hasFile && !multipartEnabled) {
            block = true;
            setStatus(statusEl, "Video uploader did not start. Please wait a moment, then reselect the file.");
            input.focus();
            input.scrollIntoView({ behavior: "smooth", block: "center" });
            return;
          }

          if (hasFile && (state !== "complete" || !signedId)) {
            block = true;
            setStatus(statusEl, "Video upload still in progress. Please wait for it to finish before saving.");
            input.focus();
            input.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        });

        if (block) {
          event.preventDefault();
          event.stopImmediatePropagation();
          syncSubmitDisabledForMultipart(form);
        }
      }, true);
    });
}
