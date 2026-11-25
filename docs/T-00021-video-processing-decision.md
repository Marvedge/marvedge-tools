# T-00021: Video Processing Architecture Decision

## Status
Proposed — pending validation through browser testing.

## Context
The Video Compressor and Video Aspect Ratio Changer currently process videos in the browser using canvas and MediaRecorder.

Browser processing avoids uploading video files to a server and reduces infrastructure and recurring compute costs. However, large videos can cause high memory usage, slow processing, browser crashes, or failed exports.

The current implementation does not enforce a file-size limit or provide sufficient processing error handling.

## Decision
Use browser-only processing for the initial version of both tools.

Do not introduce a server-side fallback at this stage.

Add explicit file validation, processing limits, and user-friendly error handling before considering the tools ready for large-file usage.

## Proposed Limits
The exact limits must be confirmed through testing.

Initial testing should evaluate:
- File size
- Video duration
- Video resolution
- Processing time
- Browser memory usage and stability
- Successful export and output playback

Choose conservative limits that work reliably on supported browsers and devices. Reject files that exceed the validated limits before processing begins.

## Required Handling
- Validate that the selected file is a supported video.
- Display the maximum supported file size and duration.
- Show a clear error when a file exceeds a limit.
- Handle unsupported MediaRecorder formats.
- Handle playback, recording, and export failures.
- Always reset the processing state after success or failure.
- Allow users to select another file after an error.
- Keep processing local to the browser; do not upload video files by default.

## Server Fallback
A server-side processor is deferred.

Reconsider this decision if testing or usage data shows that:
- Users frequently need files larger than the validated browser limits.
- Browser processing fails regularly on supported devices.
- Processing time or memory usage makes the browser experience unacceptable.
- A server-side solution provides a measurable improvement that justifies its infrastructure, upload, storage, and privacy costs.

If reconsidered, evaluate a server-side video processor such as FFmpeg with temporary storage, upload limits, timeouts, cleanup, and resource controls.

## Validation Plan
Test representative videos across supported browsers and devices.

Record:
- Input file size, duration, and resolution
- Browser and device
- Processing duration
- Export success or failure
- Error details

Use the results to finalize the supported limits.

## Outcome
The initial architecture remains browser-only. File limits will be based on validation rather than an assumed maximum. A server fallback will be considered only if measured results justify it.
