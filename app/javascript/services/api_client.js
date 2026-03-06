const csrfToken = () => document.querySelector("meta[name='csrf-token']")?.content;

function perfNowMs() {
  try {
    if (globalThis.performance && typeof globalThis.performance.now === "function") {
      return globalThis.performance.now();
    }
  } catch (_e) {}
  return Date.now();
}

export class ApiClient {
  async postJson(path, payload, options = {}) {
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

      if (/<(?:!DOCTYPE\\s+html|html)\\b/i.test(rawBody)) {
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

  timedPostJson(path, payload, options = {}) {
    const startedAt = perfNowMs();
    return this.postJson(path, payload, options)
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
}

export function createApiClient() {
  return new ApiClient();
}
