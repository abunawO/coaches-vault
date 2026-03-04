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

function buildPerfSummary(metrics, status, chunkSizeBytes, maxActiveUploads) {
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
    chunk_size_bytes: chunkSizeBytes,
    max_active_uploads: maxActiveUploads,
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

function debugMultipart(...args) {
  try {
    if (new URLSearchParams(window.location.search).get("debug_lesson_form") !== "1") return;
  } catch (_e) {
    return;
  }
  console.debug("[multipart]", ...args);
}

export class VideoMultipartUploaderService {
  constructor({
    input,
    domAdapter,
    multipartApi,
    uploadQueue,
    stateStore,
    loadUppy,
    chunkSizeBytes,
    maxActiveUploads,
    onStateChange,
    onSyncSubmit
  }) {
    this.input = input;
    this.dom = domAdapter;
    this.api = multipartApi;
    this.queue = uploadQueue;
    this.state = stateStore;
    this.loadUppy = loadUppy;
    this.chunkSizeBytes = chunkSizeBytes;
    this.maxActiveUploads = maxActiveUploads;
    this.onStateChange = typeof onStateChange === "function" ? onStateChange : () => {};
    this.onSyncSubmit = typeof onSyncSubmit === "function" ? onSyncSubmit : () => {};

    this.uppy = null;
    this.hiddenField = null;
    this.form = this.dom.form;
    this.uploadRunToken = 0;
    this.heldSlot = null;
    this.currentOriginalName = null;
    this.currentPerfMetrics = null;
    this.boundChangeHandler = null;
    this.destroyed = false;
    this.destroying = false;
  }

  getState() {
    return this.state.get(this.input);
  }

  setState(state, signedId = null) {
    this.state.set(this.input, state, signedId);
    this.onStateChange({ input: this.input, state, signedId });
  }

  releaseHeldSlot(token = null) {
    if (!this.heldSlot) return;
    if (token !== null && this.heldSlot.token !== token) return;
    const releaser = this.heldSlot.release;
    this.heldSlot = null;
    releaser();
  }

  logPerfSummary(status, token, extras = {}) {
    if (!this.currentPerfMetrics) return;
    if (token == null) return;
    if (this.currentPerfMetrics.token !== token) return;
    if (this.currentPerfMetrics.summaryLogged) return;
    this.currentPerfMetrics.summaryLogged = true;
    if (this.currentPerfMetrics.upload_started_at != null) {
      this.currentPerfMetrics.upload_total_ms = perfNowMs() - this.currentPerfMetrics.upload_started_at;
    }
    const summary = buildPerfSummary({ ...this.currentPerfMetrics, ...extras }, status, this.chunkSizeBytes, this.maxActiveUploads);
    if (summary) debugUploadPerf(summary);
    this.currentPerfMetrics = null;
  }

  async bind() {
    if (this.destroyed) return false;
    if (this.input.dataset.uploaderBound === "true") return true;

    this.hiddenField = this.dom.ensureHiddenField();
    this.currentOriginalName = this.dom.resolveOriginalInputName(this.hiddenField);
    if (!this.currentOriginalName) {
      debugMultipart("defer uploader bind until input has name", { id: this.input.id || null });
      return false;
    }

    const { Uppy, AwsS3Multipart } = await this.loadUppy();

    this.uppy = new Uppy({
      autoProceed: false,
      allowMultipleUploadBatches: false,
      restrictions: { maxNumberOfFiles: 1, allowedFileTypes: ["video/mp4", "video/quicktime"] }
    });

    this.uppy.use(AwsS3Multipart, {
      limit: 1,
      getChunkSize: () => this.chunkSizeBytes,
      createMultipartUpload: (file) =>
        this.api
          .createMultipartUpload(
            {
              filename: file.name,
              content_type: file.type,
              byte_size: file.size,
              checksum: file.meta?.checksum
            },
            {
              traceId: this.currentPerfMetrics?.trace_id,
              onComplete: ({ ms }) => {
                if (this.currentPerfMetrics) this.currentPerfMetrics.create_ms = ms;
              }
            }
          )
          .then((data) => {
            file.meta.uploadId = data.upload_id;
            file.meta.key = data.key;
            return { uploadId: data.upload_id, key: data.key, bucket: data.bucket, region: data.region };
          }),
      signPart: (file, { uploadId, key, partNumber }) =>
        this.api.signPart(
          {
            upload_id: uploadId,
            key,
            part_number: partNumber
          },
          {
            traceId: this.currentPerfMetrics?.trace_id,
            onComplete: ({ ms }) => {
              if (!this.currentPerfMetrics) return;
              this.currentPerfMetrics.sign_part_count = (this.currentPerfMetrics.sign_part_count || 0) + 1;
              this.currentPerfMetrics.sign_part_ms_total = (this.currentPerfMetrics.sign_part_ms_total || 0) + ms;
            }
          }
        ),
      completeMultipartUpload: (file, { uploadId, key, parts }) =>
        this.api.completeMultipartUpload(
          {
            upload_id: uploadId,
            key,
            filename: file.name,
            content_type: file.type,
            byte_size: file.size,
            checksum: file.meta?.checksum,
            parts
          },
          {
            traceId: this.currentPerfMetrics?.trace_id,
            onComplete: ({ ms }) => {
              if (!this.currentPerfMetrics) return;
              this.currentPerfMetrics.complete_ms = ms;
              this.currentPerfMetrics.parts_count = Array.isArray(parts) ? parts.length : null;
            }
          }
        ),
      abortMultipartUpload: (file, uploadData) =>
        this.api.abortMultipartUpload(
          {
            upload_id: uploadData?.uploadId || file?.meta?.uploadId,
            key: uploadData?.key || file?.meta?.key
          },
          {
            traceId: this.currentPerfMetrics?.trace_id
          }
        )
    });

    this.bindUppyEvents();

    this.boundChangeHandler = () => {
      this.startUploadForSelectedFile().catch((error) => {
        this.dom.setStatus(`Upload failed: ${formatMultipartUploadError(error)}`);
        this.setState("failed");
        this.dom.hideUploadProgress();
        this.dom.clearHiddenSignedId(this.hiddenField);
        this.dom.preventRawFileSubmit({ clearValue: false });
        this.onSyncSubmit(this.form);
      });
    };
    this.input.addEventListener("change", this.boundChangeHandler);

    this.input.dataset.uploaderBound = "true";
    this.dom.preventRawFileSubmit({ clearValue: false });
    debugMultipart("bound input", { name: this.input.name });

    if ((this.input.files?.length || 0) > 0) {
      const { state } = this.getState();
      if (state === "idle") {
        this.dom.setStatus("Preparing upload…");
        this.dom.showUploadProgress();
        this.onSyncSubmit(this.form);
        window.setTimeout(() => {
          if (!document.contains(this.input)) return;
          if ((this.input.files?.length || 0) === 0) return;
          const currentState = this.getState().state;
          if (currentState !== "idle") return;
          this.startUploadForSelectedFile().catch((error) => {
            this.dom.setStatus(`Upload failed: ${formatMultipartUploadError(error)}`);
            this.setState("failed");
            this.dom.hideUploadProgress();
            this.dom.clearHiddenSignedId(this.hiddenField);
            this.dom.preventRawFileSubmit({ clearValue: false });
            this.onSyncSubmit(this.form);
          });
        }, 0);
      }
    }

    return true;
  }

  bindUppyEvents() {
    this.uppy.on("progress", (progress) => {
      this.setState("uploading");
      this.onSyncSubmit(this.form);
      this.dom.showUploadProgress(progress);
      this.dom.setStatus(`Uploading… ${Math.floor(progress)}%`);
    });

    this.uppy.on("upload-success", (_file, response) => {
      const signedId = response?.body?.signed_id;
      if (!signedId) {
        this.dom.setStatus("Upload finished but no signed file reference was returned. Please retry.");
        this.setState("failed");
        this.dom.hideUploadProgress();
        this.dom.clearHiddenSignedId(this.hiddenField);
        this.dom.preventRawFileSubmit({ clearValue: false });
        this.logPerfSummary("error", this.currentPerfMetrics?.token);
        this.onSyncSubmit(this.form);
        return;
      }

      const originalName = this.currentOriginalName || this.dom.resolveOriginalInputName(this.hiddenField);
      if (this.hiddenField) {
        if (!originalName) {
          this.dom.setStatus("Missing input name; please reload and retry.");
          this.setState("failed");
          this.dom.hideUploadProgress();
          this.dom.clearHiddenSignedId(this.hiddenField);
          this.dom.preventRawFileSubmit({ clearValue: false });
          this.logPerfSummary("error", this.currentPerfMetrics?.token);
          this.onSyncSubmit(this.form);
          return;
        }
        this.dom.setHiddenSignedId(this.hiddenField, signedId, originalName);
        this.dom.preventRawFileSubmit();
      }
      this.setState("complete", signedId);
      this.dom.showUploadProgress(100);
      this.dom.setStatus("Upload complete");
      this.logPerfSummary("success", this.currentPerfMetrics?.token);
      this.onSyncSubmit(this.form);
    });

    this.uppy.on("upload-error", (_file, error) => {
      this.dom.setStatus(`Upload failed: ${formatMultipartUploadError(error)}`);
      this.setState("failed");
      this.dom.hideUploadProgress();
      this.dom.clearHiddenSignedId(this.hiddenField);
      this.dom.preventRawFileSubmit({ clearValue: false });
      this.logPerfSummary("error", this.currentPerfMetrics?.token);
      this.onSyncSubmit(this.form);
    });

    this.uppy.on("error", (error) => {
      this.dom.setStatus(`Error: ${formatMultipartUploadError(error)}`);
      this.setState("failed");
      this.dom.hideUploadProgress();
      this.dom.clearHiddenSignedId(this.hiddenField);
      this.dom.preventRawFileSubmit({ clearValue: false });
      this.logPerfSummary("error", this.currentPerfMetrics?.token);
      this.onSyncSubmit(this.form);
    });

    this.uppy.on("cancel-all", () => {
      this.logPerfSummary("canceled", this.heldSlot?.token);
      this.releaseHeldSlot();
    });
  }

  async startUploadForSelectedFile() {
    if (this.destroyed) return;
    const [file] = this.input.files || [];
    if (!file) {
      this.logPerfSummary("canceled", this.currentPerfMetrics?.token);
      const restoreName = this.currentOriginalName || this.dom.resolveOriginalInputName(this.hiddenField);
      this.dom.clearHiddenSignedId(this.hiddenField);
      this.dom.hideUploadProgress();
      if (restoreName && !this.input.dataset.multipartOriginalName) {
        this.input.dataset.multipartOriginalName = restoreName;
      }
      this.dom.preventRawFileSubmit({ clearValue: false });
      this.setState("idle", null);
      this.releaseHeldSlot();
      this.onSyncSubmit(this.form);
      return;
    }

    this.uploadRunToken += 1;
    const thisRunToken = this.uploadRunToken;
    this.currentOriginalName = this.dom.resolveOriginalInputName(this.hiddenField);
    if (!this.currentOriginalName) {
      this.dom.setStatus("Missing input name; please reload and retry.");
      this.setState("failed");
      this.currentPerfMetrics = null;
      this.onSyncSubmit(this.form);
      return;
    }

    const previousPerfToken = this.currentPerfMetrics?.token;
    this.logPerfSummary("canceled", previousPerfToken);

    this.currentPerfMetrics = {
      token: thisRunToken,
      trace_id: uploadPerfEnabled() ? makeUploadTraceId() : null,
      file_name: file.name,
      file_size: file.size,
      mime: file.type,
      input_name: this.currentOriginalName,
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

    this.dom.clearHiddenSignedId(this.hiddenField);
    this.input.disabled = false;
    this.input.removeAttribute("name");
    this.releaseHeldSlot();

    this.uppy.cancelAll();
    this.setState("queued");
    this.onSyncSubmit(this.form);
    this.dom.showUploadProgress();
    this.dom.setStatus("Queued for upload…");

    let slotReleaser;
    const queueWaitStartedAt = perfNowMs();
    try {
      slotReleaser = await this.queue.acquire();
      if (thisRunToken !== this.uploadRunToken) {
        slotReleaser();
        return;
      }

      this.heldSlot = { release: slotReleaser, token: thisRunToken };
      if (this.currentPerfMetrics && this.currentPerfMetrics.token === thisRunToken) {
        this.currentPerfMetrics.queue_wait_ms = perfNowMs() - queueWaitStartedAt;
        this.currentPerfMetrics.upload_started_at = perfNowMs();
      }

      this.setState("uploading");
      this.onSyncSubmit(this.form);
      this.dom.showUploadProgress();
      this.dom.setStatus("Starting upload…");

      this.uppy.addFile({
        name: file.name,
        type: file.type,
        data: file,
        meta: { checksum: null }
      });

      await this.uppy.upload();
    } catch (error) {
      this.dom.setStatus(`Upload failed: ${formatMultipartUploadError(error)}`);
      this.setState("failed");
      this.dom.hideUploadProgress();
      this.dom.clearHiddenSignedId(this.hiddenField);
      this.dom.preventRawFileSubmit({ clearValue: false });
      this.logPerfSummary("error", thisRunToken);
      this.onSyncSubmit(this.form);
    } finally {
      if (this.heldSlot && this.heldSlot.token === thisRunToken) {
        this.releaseHeldSlot(thisRunToken);
      } else if (slotReleaser) {
        slotReleaser();
      }
    }
  }

  destroy() {
    if (this.destroyed || this.destroying) return;
    this.destroying = true;

    if (this.boundChangeHandler) {
      this.input.removeEventListener("change", this.boundChangeHandler);
      this.boundChangeHandler = null;
    }

    this.releaseHeldSlot();

    if (this.uppy) {
      try {
        this.uppy.cancelAll();
      } catch (_e) {}

      try {
        if (typeof this.uppy.close === "function") this.uppy.close();
      } catch (_e) {}

      this.uppy = null;
    }

    this.setState("idle", null);
    delete this.input.dataset.uploaderBound;
    this.onSyncSubmit(this.form);

    this.destroyed = true;
    this.destroying = false;
  }
}
