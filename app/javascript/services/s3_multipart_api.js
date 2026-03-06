import { createApiClient } from "services/api_client";

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

export class S3MultipartApi {
  constructor({ apiClient = createApiClient() } = {}) {
    this.apiClient = apiClient;
  }

  withTrace(traceId) {
    return traceId ? { "X-Upload-Trace": traceId } : {};
  }

  createMultipartUpload(payload, { traceId = null, onComplete } = {}) {
    return this.apiClient.timedPostJson("/s3/multipart/create", payload, {
      headers: this.withTrace(traceId),
      onComplete
    });
  }

  signPart(payload, { traceId = null, onComplete } = {}) {
    return this.apiClient.timedPostJson("/s3/multipart/sign_part", payload, {
      headers: this.withTrace(traceId),
      onComplete
    });
  }

  completeMultipartUpload(payload, { traceId = null, onComplete } = {}) {
    const normalized = {
      ...payload,
      parts: normalizeCompletedParts(payload.parts)
    };

    return this.apiClient.timedPostJson("/s3/multipart/complete", normalized, {
      headers: this.withTrace(traceId),
      onComplete
    });
  }

  abortMultipartUpload(payload, { traceId = null, onComplete } = {}) {
    return this.apiClient.timedPostJson("/s3/multipart/abort", payload, {
      headers: this.withTrace(traceId),
      onComplete
    });
  }
}

export function createS3MultipartApi() {
  return new S3MultipartApi();
}
