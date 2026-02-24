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
    const message = await response.text();
    throw new Error(message || `Request failed (${response.status})`);
  }

  return response.json();
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

function ensureHiddenField(input) {
  const existing = input.closest("[data-slide-row]")?.querySelector("[data-video-signed-id]");
  if (existing) return existing;

  const hidden = document.createElement("input");
  hidden.type = "hidden";
  hidden.dataset.videoSignedId = "true";
  input.insertAdjacentElement("afterend", hidden);
  return hidden;
}

function setStatus(statusEl, text) {
  if (statusEl) statusEl.textContent = text;
}

function resetFieldNames(input, hidden, originalName) {
  if (hidden) hidden.name = "";
  if (input && originalName) input.name = originalName;
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
    uppyModulesPromise = Promise.all([import("@uppy/core"), import("@uppy/aws-s3-multipart")]);
  }
  const [{ default: Uppy }, { default: AwsS3Multipart }] = await uppyModulesPromise;
  return { Uppy, AwsS3Multipart };
}

async function applyUploader(input) {
  if (input.dataset.uploaderBound === "true") return;

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
      limit: 3,
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
            parts: parts.map((p) => ({ part_number: p.partNumber, etag: p.etag }))
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
      if (form) disableSubmit(form);
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
        input.removeAttribute("name");
        input.value = "";
        input.disabled = true;
      }
      setState(input, "complete", signedId);
      setStatus(statusEl, "Upload complete");
      logPerfSummary("success", currentPerfMetrics?.token);
      if (form && allUploadsReady(form)) enableSubmit(form);
    });

    uppy.on("upload-error", (_file, error) => {
      setStatus(statusEl, `Upload failed: ${error?.message || error}`);
      setState(input, "failed");
      hiddenField.value = "";
      const originalName = currentOriginalName || resolveOriginalInputName(input, hiddenField);
      resetFieldNames(input, hiddenField, originalName);
      logPerfSummary("error", currentPerfMetrics?.token);
      if (form) enableSubmit(form);
    });

    uppy.on("error", (error) => {
      setStatus(statusEl, `Error: ${error?.message || error}`);
      setState(input, "failed");
      hiddenField.value = "";
      const originalName = currentOriginalName || resolveOriginalInputName(input, hiddenField);
      resetFieldNames(input, hiddenField, originalName);
      logPerfSummary("error", currentPerfMetrics?.token);
      if (form) enableSubmit(form);
    });

    uppy.on("cancel-all", () => {
      logPerfSummary("canceled", heldSlot?.token);
      releaseHeldSlot();
    });

    input.addEventListener("change", async () => {
      const [file] = input.files || [];
      if (!file) {
        logPerfSummary("canceled", currentPerfMetrics?.token);
        const restoreName = currentOriginalName || resolveOriginalInputName(input, hiddenField);
        hiddenField.value = "";
        hiddenField.name = "";
        input.disabled = false;
        if (restoreName) input.name = restoreName;
        setState(input, "idle", null);
        releaseHeldSlot();
        return;
      }

      uploadRunToken += 1;
      const thisRunToken = uploadRunToken;
      currentOriginalName = resolveOriginalInputName(input, hiddenField);
      if (!currentOriginalName) {
        setStatus(statusEl, "Missing input name; please reload and retry.");
        setState(input, "failed");
        currentPerfMetrics = null;
        if (form) enableSubmit(form);
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
      input.name = "";
      releaseHeldSlot();

      uppy.cancelAll();
      uppy.reset();
      setState(input, "queued");
      if (form) disableSubmit(form);
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
        if (form) disableSubmit(form);
        setStatus(statusEl, "Starting upload…");

        uppy.addFile({
          name: file.name,
          type: file.type,
          data: file,
          meta: { checksum: null }
        });

        await uppy.upload();
      } catch (error) {
        setStatus(statusEl, `Upload failed: ${error?.message || error}`);
        setState(input, "failed");
        hiddenField.value = "";
        const originalName = currentOriginalName || resolveOriginalInputName(input, hiddenField);
        resetFieldNames(input, hiddenField, originalName);
        logPerfSummary("error", thisRunToken);
        if (form) enableSubmit(form);
      } finally {
        if (heldSlot && heldSlot.token === thisRunToken) {
          releaseHeldSlot(thisRunToken);
        } else if (slotReleaser) {
          slotReleaser();
        }
      }
    });

    input.dataset.uploaderBound = "true";
    debugMultipart("bound input", { name: input.name });
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
          // If uploader never bound (e.g., script failed to load), allow normal submit.
          if (input.dataset.uploaderBound !== "true") return;

          const statusEl = ensureStatusElement(input);
          const { state, signedId } = getState(input);
          const hasFile = (input.files?.length || 0) > 0;

          if (state === "failed") {
            block = true;
            setStatus(statusEl, "Video upload failed. Please retry the upload before saving.");
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
          enableSubmit(form);
        }
      });
    });
}
