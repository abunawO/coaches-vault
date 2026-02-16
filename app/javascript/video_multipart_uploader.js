const csrfToken = () => document.querySelector("meta[name='csrf-token']")?.content;

async function postJson(path, payload) {
  const response = await fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-Token": csrfToken()
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
  if (input) input.name = originalName;
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

let warnedFallback = false;
function warnFallbackOnce(error) {
  if (warnedFallback) return;
  warnedFallback = true;
  // eslint-disable-next-line no-console
  console.warn("Multipart video uploader failed to initialize; falling back to normal form upload.", error);
}

let uppyModulesPromise;
async function loadUppy() {
  if (!uppyModulesPromise) {
    uppyModulesPromise = Promise.all([import("@uppy/core"), import("@uppy/aws-s3-multipart")]);
  }
  const [{ default: Uppy }, { default: AwsS3Multipart }] = await uppyModulesPromise;
  return { Uppy, AwsS3Multipart };
}

function resetUploader(uppy) {
  if (!uppy) return;

  if (typeof uppy.reset === "function") {
    uppy.reset();
    return;
  }

  if (typeof uppy.cancelAll === "function") {
    uppy.cancelAll();
  }

  if (typeof uppy.getFiles === "function" && typeof uppy.removeFile === "function") {
    uppy.getFiles().forEach((file) => {
      if (file?.id) uppy.removeFile(file.id);
    });
  }
}

async function applyUploader(input) {
  if (input.dataset.uploaderBound === "true") return;

  try {
    const statusEl = ensureStatusElement(input);
    const hiddenField = ensureHiddenField(input);
    const originalName = input.getAttribute("name");
    const form = input.closest("form");
    const { Uppy, AwsS3Multipart } = await loadUppy();

    const uppy = new Uppy({
      autoProceed: true,
      allowMultipleUploadBatches: false,
      restrictions: { maxNumberOfFiles: 1, allowedFileTypes: ["video/mp4", "video/quicktime"] }
    });

    uppy.use(AwsS3Multipart, {
      limit: 3,
      createMultipartUpload: (file) => {
        console.debug("[video-upload] starting multipart create");
        return postJson("/s3/multipart/create", {
          filename: file.name,
          content_type: file.type,
          byte_size: file.size,
          checksum: file.meta?.checksum
        }).then((data) => {
          file.meta.uploadId = data.upload_id;
          file.meta.key = data.key;
          return { uploadId: data.upload_id, key: data.key, bucket: data.bucket, region: data.region };
        });
      },
      signPart: (file, { uploadId, key, partNumber }) =>
        postJson("/s3/multipart/sign_part", {
          upload_id: uploadId,
          key: key,
          part_number: partNumber
        }),
      completeMultipartUpload: (file, { uploadId, key, parts }) =>
        postJson("/s3/multipart/complete", {
          upload_id: uploadId,
          key: key,
          filename: file.name,
          content_type: file.type,
          byte_size: file.size,
          checksum: file.meta?.checksum,
          parts: parts.map((p) => ({ part_number: p.partNumber, etag: p.etag }))
        }),
      abortMultipartUpload: (file, uploadData) =>
        postJson("/s3/multipart/abort", {
          upload_id: uploadData?.uploadId || file?.meta?.uploadId,
          key: uploadData?.key || file?.meta?.key
        })
    });

    uppy.on("progress", (progress) => {
      setState(input, "uploading");
      if (form) disableSubmit(form);
      setStatus(statusEl, `Uploading… ${Math.floor(progress)}%`);
    });

    uppy.on("upload-success", (_file, response) => {
      const signedId = response?.body?.signed_id;
      if (signedId && hiddenField) {
        hiddenField.value = signedId;
        hiddenField.name = originalName;
        input.removeAttribute("name");
        input.value = "";
        input.disabled = true;
      }
      setState(input, "complete", signedId);
      setStatus(statusEl, "Upload complete");
      if (form && allUploadsReady(form)) enableSubmit(form);
    });

    uppy.on("upload-error", (_file, error) => {
      setStatus(statusEl, `Upload failed: ${error?.message || error}`);
      setState(input, "failed");
      resetFieldNames(input, hiddenField, originalName);
      if (form) enableSubmit(form);
    });

    uppy.on("error", (error) => {
      setStatus(statusEl, `Error: ${error?.message || error}`);
      setState(input, "failed");
      resetFieldNames(input, hiddenField, originalName);
      if (form) enableSubmit(form);
    });

    input.addEventListener("change", () => {
      const [file] = input.files || [];
      if (!file) return;

      hiddenField.value = "";
      hiddenField.name = "";
      input.name = "";
      input.disabled = false;

      resetUploader(uppy);
      setState(input, "uploading");
      if (form) disableSubmit(form);
      setStatus(statusEl, "Starting upload…");
      uppy.addFile({
        name: file.name,
        type: file.type,
        data: file,
        meta: { checksum: null }
      });
    });

    input.dataset.uploaderBound = "true";
  } catch (error) {
    warnFallbackOnce(error);
  }
}

export function initVideoMultipartUploads(root = document) {
  try {
    const inputs = Array.from(root.querySelectorAll("[data-video-multipart-upload='true']"));
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
