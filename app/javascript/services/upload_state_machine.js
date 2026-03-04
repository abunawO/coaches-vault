export function createUploadStateStore() {
  const uploadState = new WeakMap();
  const warnedInvariants = new WeakMap();

  const warnOnce = (input, key, message) => {
    const existing = warnedInvariants.get(input) || {};
    if (existing[key]) return;
    existing[key] = true;
    warnedInvariants.set(input, existing);

    // eslint-disable-next-line no-console
    console.warn(message, {
      inputId: input?.id || null,
      inputName: input?.name || input?.dataset?.multipartOriginalName || null
    });
  };

  const set = (input, state, signedId = null) => {
    if (state === "complete" && !signedId) {
      warnOnce(input, "completeWithoutSignedId", "[video-upload] invariant: complete state without signedId");
    }
    if (state === "idle" && signedId) {
      warnOnce(input, "idleWithSignedId", "[video-upload] invariant: idle state with signedId");
    }

    const current = uploadState.get(input) || {};
    uploadState.set(input, { ...current, state, signedId });
  };

  const get = (input) => uploadState.get(input) || { state: "idle", signedId: null };

  return { set, get };
}

export function hasPendingMultipartUploads(inputs, getState) {
  return inputs.some((input) => {
    const { state, signedId } = getState(input);
    const hasFile = (input.files?.length || 0) > 0;
    if (state === "queued" || state === "uploading") return true;
    if (hasFile && (state !== "complete" || !signedId)) return true;
    return false;
  });
}

export function allUploadsReady(inputs, getState) {
  return inputs.every((input) => {
    const { state, signedId } = getState(input);
    if (state === "failed") return false;
    if (state === "uploading") return false;
    if (input.files?.length && state !== "complete") return false;
    if (state === "complete" && !signedId) return false;
    return true;
  });
}
