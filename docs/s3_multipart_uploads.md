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
