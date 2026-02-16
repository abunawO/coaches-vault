# S3 multipart uploads for lesson videos

## Required IAM actions (bucket level)
- `s3:CreateMultipartUpload`
- `s3:UploadPart`
- `s3:ListMultipartUploadParts`
- `s3:CompleteMultipartUpload`
- `s3:AbortMultipartUpload`
- `s3:PutObject` (for final object persistence)

## Suggested S3 CORS config
```json
[
  {
    "AllowedOrigins": ["http://localhost:3000", "https://YOUR_APP_HOST"],
    "AllowedMethods": ["PUT"],
    "AllowedHeaders": [
      "Content-Type",
      "Content-MD5",
      "X-Amz-Date",
      "Authorization",
      "X-Amz-Security-Token",
      "X-Amz-User-Agent",
      "x-amz-content-sha256"
    ],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

Notes:
- Multipart parts use presigned `PUT` URLs; only `ETag` needs to be exposed for the client to report part ETags back to Rails.
- Keep origins aligned with both local dev and production hosts; add staging hosts if needed.
- If custom CA bundles are required, keep `AWS_SSL_CA_BUNDLE` configured (already wired in initializers).

## Known issue: video upload hangs while image upload works

Symptoms:
- Image slides save normally, but video slides hang.
- No `/s3/multipart/*` request is sent.
- Console shows errors like:
  - `TypeError: uppy.reset is not a function`
  - `404` loading `@uppy/*` modules from `ga.jspm.io` with mismatched versions.

Root cause:
- Split JavaScript runtime (importmap + stale bundled artifact) can cause the browser to execute old uploader code.
- In this incident, a stale `application.js` artifact contained old Uppy behavior (`uppy.reset()`) and old dependency URLs, while source/importmap had newer code.

Fix applied:
- Keep importmap as canonical runtime.
- Pin compatible Uppy versions in `config/importmap.rb`:
  - `@uppy/core@3.12.0`
  - `@uppy/aws-s3-multipart@3.6.0`
  - `@uppy/utils@5.9.0`
  - `@uppy/store-default@3.2.2`
  - `@uppy/companion-client@3.8.1`
- Use compatibility reset logic in `app/javascript/video_multipart_uploader.js` (do not rely on `uppy.reset()` existing across versions).
- Pin importmap `application` to `main.js` to avoid collision with stale `application.js` build artifacts.

Quick verification:
1. Restart Rails server.
2. Hard refresh browser with cache disabled.
3. Confirm importmap resolves expected Uppy pin:
   - `JSON.parse(document.querySelector('script[type="importmap"]').textContent).imports["@uppy/core"]`
4. Select a video and confirm:
   - Console prints `[video-upload] starting multipart create`
   - Network shows `/s3/multipart/create`, then sign/complete calls.
