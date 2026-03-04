import { LessonMediaRowAdapter } from "adapters/lesson_media_row_adapter"

export class LessonMediaBulkCoordinator {
  constructor({ appendRowForKind, assignFileToRow, triggerVideoUploadIfBound }) {
    this.appendRowForKind = appendRowForKind
    this.assignFileToRow = assignFileToRow
    this.triggerVideoUploadIfBound = triggerVideoUploadIfBound
  }

  kindForFile(file) {
    const type = (file?.type || "").toLowerCase()
    if (type.startsWith("image/")) return "image"
    if (type === "video/mp4" || type === "video/quicktime") return "video"
    return null
  }

  async processFiles(fileList) {
    const files = Array.from(fileList || [])
    const result = {
      total: files.length,
      added: 0,
      skipped: 0,
      skippedBecauseFull: 0,
      videosQueued: 0,
      imagesAdded: 0,
      errors: [],
      // Backward-compatible fields used by existing caller messaging.
      supportedCount: 0,
      unsupportedCount: 0,
      assignmentFailures: 0,
      addedCount: 0
    }

    for (const file of files) {
      const kind = this.kindForFile(file)
      if (!kind) {
        result.unsupportedCount += 1
        result.skipped += 1
        continue
      }
      result.supportedCount += 1

      const row = this.appendRowForKind(kind)
      if (!row) {
        result.skippedBecauseFull += 1
        result.skipped += 1
        continue
      }

      const assigned = this.assignFileToRow(row, kind, file)
      if (!assigned) {
        row.remove()
        result.assignmentFailures += 1
        result.skipped += 1
        result.errors.push({
          code: "assign_failed",
          message: "Failed to assign file to row input",
          kind,
          fileName: file?.name || null
        })
        continue
      }

      result.added += 1
      result.addedCount += 1
      if (kind === "video") {
        const fileInput = new LessonMediaRowAdapter(row).videoFileInput
        result.videosQueued += 1
        await this.triggerVideoUploadIfBound(fileInput)
      } else {
        result.imagesAdded += 1
      }
    }

    return result
  }
}
