import { VideoUploadDomAdapter, disableSubmit, enableSubmit } from "adapters/video_upload_dom_adapter";
import { createS3MultipartApi } from "services/s3_multipart_api";
import { UploadQueue } from "services/upload_queue";
import { createUploadStateStore } from "services/upload_state_machine";
import { VideoMultipartUploaderService } from "services/video_multipart_uploader_service";

const MULTIPART_CHUNK_SIZE_BYTES = 15 * 1024 * 1024;
const MAX_ACTIVE_UPLOADS = 2;

const multipartApi = createS3MultipartApi();
const uploadQueue = new UploadQueue({ maxActive: MAX_ACTIVE_UPLOADS });
const stateStore = createUploadStateStore();
const adapterRegistry = new WeakMap();
const serviceByInput = new WeakMap();
const trackedInputs = new Set();

let uppyModulesPromise;
let warnedFallback = false;

function warnFallbackOnce(error) {
  if (warnedFallback) return;
  warnedFallback = true;
  // eslint-disable-next-line no-console
  console.warn("Multipart video uploader failed to initialize; falling back to normal form upload.", error);
}

async function loadUppy() {
  if (!uppyModulesPromise) {
    uppyModulesPromise = import("uppy_bundle")
      .then((bundled) => {
        if (bundled?.Uppy && bundled?.AwsS3Multipart) {
          return { Uppy: bundled.Uppy, AwsS3Multipart: bundled.AwsS3Multipart };
        }
        throw new Error("Local uppy_bundle is missing Uppy exports");
      })
      .catch((error) => {
        // Allow future retries after transient bundle-load failures.
        uppyModulesPromise = null;
        throw error;
      });
  }
  return uppyModulesPromise;
}

function syncSubmitDisabledForMultipart(form) {
  if (!form) return;
  syncFormSubmitState(form);
}

function setMultipartFooterMessage(formEl, message) {
  if (!formEl) return;
  const statusEl = formEl.querySelector("[data-form-submit-lock-target='status']");
  if (!statusEl) return;
  statusEl.textContent = message || "";
  statusEl.style.display = message ? "inline" : "none";
}

function dispatchMultipartState(formEl, state, input = null) {
  if (!formEl || !state) return;
  formEl.dispatchEvent(
    new CustomEvent("video-multipart:state-change", {
      bubbles: true,
      detail: {
        state,
        inputName: input?.dataset?.multipartOriginalName || input?.name || null
      }
    })
  );
}

function isDestroyedRowInput(input) {
  if (!input) return false;
  const dom = adapterRegistry.get(input) || new VideoUploadDomAdapter(input);
  return dom.isRowDestroyed();
}

function blockingReasonForInput(input) {
  if (isDestroyedRowInput(input)) return null;
  const { state, signedId } = stateStore.get(input);

  if (state === "queued" || state === "uploading") {
    return "Video upload in progress. Please wait before saving.";
  }

  if (state === "failed") {
    return "Video upload failed. Please fix it before saving.";
  }

  if (state !== "idle" && state !== "complete") {
    return "Video upload in progress. Please wait before saving.";
  }

  if (state === "complete" && !signedId) {
    return "Video upload still in progress. Please wait for it to finish before saving.";
  }

  return null;
}

function syncFormSubmitState(formEl) {
  if (!formEl) return;
  const inputs = Array.from(formEl.querySelectorAll("[data-video-multipart-upload='true']"))
    .filter((input) => !isDestroyedRowInput(input));
  const blockingReason = inputs.map(blockingReasonForInput).find(Boolean);

  if (blockingReason) {
    disableSubmit(formEl, "Uploading...");
    setMultipartFooterMessage(formEl, blockingReason);
  } else {
    enableSubmit(formEl);
    setMultipartFooterMessage(formEl, "");
  }
}

async function applyUploader(input) {
  const existingService = serviceByInput.get(input);
  if (existingService) {
    const form = input.closest("form");
    existingService.destroy();
    serviceByInput.delete(input);
    syncFormSubmitState(form);
  }

  if (input.dataset.uploaderBound === "true") return;

  const dom = new VideoUploadDomAdapter(input);
  const originalName = dom.resolveOriginalInputName();
  if (!originalName) {
    try {
      if (new URLSearchParams(window.location.search).get("debug_lesson_form") === "1") {
        console.debug("[multipart]", "defer uploader bind until input has name", { id: input.id || null });
      }
    } catch (_e) {}
    return;
  }

  adapterRegistry.set(input, dom);

  try {
    const service = new VideoMultipartUploaderService({
      input,
      domAdapter: dom,
      multipartApi,
      uploadQueue,
      stateStore,
      loadUppy,
      chunkSizeBytes: MULTIPART_CHUNK_SIZE_BYTES,
      maxActiveUploads: MAX_ACTIVE_UPLOADS,
      onStateChange: ({ input: changedInput, state }) => {
        const form = changedInput?.closest("form");
        syncFormSubmitState(form);
        if (state === "complete" || state === "failed" || state === "idle") {
          dispatchMultipartState(form, state, changedInput);
        }
      },
      onSyncSubmit: (form) => syncFormSubmitState(form)
    });

    const bound = await service.bind();
    if (bound) {
      serviceByInput.set(input, service);
      trackedInputs.add(input);
      syncFormSubmitState(input.closest("form"));
    } else {
      service.destroy();
      syncFormSubmitState(input.closest("form"));
    }
  } catch (error) {
    warnFallbackOnce(error);
  }
}

function clearMultipartBindingForInput(input) {
  if (!input) return;
  const form = input.closest("form");
  const service = serviceByInput.get(input);
  if (service) {
    service.destroy();
    serviceByInput.delete(input);
  } else {
    stateStore.set(input, "idle", null);
  }

  const dom = adapterRegistry.get(input) || new VideoUploadDomAdapter(input);
  const hiddenField = dom.ensureHiddenField();
  dom.clearHiddenSignedId(hiddenField);
  dom.resetUploadUi();
  dom.preventRawFileSubmit({ clearValue: true });
  trackedInputs.delete(input);
  syncFormSubmitState(form);
  dispatchMultipartState(form, "idle", input);
}

export function clearVideoMultipartUploadForRow(rowEl) {
  if (!rowEl || typeof rowEl.querySelectorAll !== "function") return;
  const videoInputs = Array.from(rowEl.querySelectorAll("[data-video-multipart-upload='true']"));
  videoInputs.forEach((input) => clearMultipartBindingForInput(input));
}

export function syncVideoMultipartSubmitState(formEl) {
  syncFormSubmitState(formEl);
}

export function initVideoMultipartUploads(root = document) {
  try {
    trackedInputs.forEach((input) => {
      if (input && !input.isConnected) {
        const service = serviceByInput.get(input);
        if (service) {
          const form = input.closest("form");
          service.destroy();
          serviceByInput.delete(input);
          syncFormSubmitState(form);
        }
        trackedInputs.delete(input);
      }
    });

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
window.clearVideoMultipartUploadForRow ||= clearVideoMultipartUploadForRow;
window.syncVideoMultipartSubmitState ||= syncVideoMultipartSubmitState;

function addFormGuards(inputs) {
  inputs
    .map((input) => input.closest("form"))
    .filter(Boolean)
    .forEach((form) => {
      if (form.dataset.multipartSubmitGuard === "true") return;
      form.dataset.multipartSubmitGuard = "true";

      form.addEventListener(
        "submit",
        (event) => {
          const videoInputs = Array.from(form.querySelectorAll("[data-video-multipart-upload='true']"));
          let block = false;

          videoInputs.forEach((input) => {
            const dom = adapterRegistry.get(input) || new VideoUploadDomAdapter(input);
            if (dom.isRowDestroyed()) return;
            const reason = blockingReasonForInput(input);
            const hasFile = (input.files?.length || 0) > 0;
            const multipartEnabled = input.dataset.uploaderBound === "true";

            if (hasFile || multipartEnabled) {
              dom.preventRawFileSubmit({ clearValue: false });
            }

            if (reason) {
              block = true;
              dom.setStatus(reason);
              dom.focusAndScroll();
              return;
            }
          });

          if (block) {
            event.preventDefault();
            event.stopImmediatePropagation();
            syncSubmitDisabledForMultipart(form);
          }
        },
        true
      );
    });
}
