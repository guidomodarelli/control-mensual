/**
 * Renders a standardized receipt uploader built on top of Untitled UI file upload primitives.
 *
 * @module receipt-file-uploader
 */

import { useEffect, useRef, useState } from "react";

import { FileUpload } from "@/components/application/file-upload/file-upload-base";

import {
  RECEIPT_UPLOAD_ACCEPT_ATTRIBUTE,
  RECEIPT_UPLOAD_HINT_TEXT,
  RECEIPT_UPLOAD_MAX_SIZE_BYTES,
} from "./receipt-upload.constants";

interface ReceiptFileUploaderProps {
  errorMessage?: string | null;
  inputId?: string;
  inputAriaLabel: string;
  isDisabled?: boolean;
  isUploading?: boolean;
  onFileChange: (file: File | null) => void;
  onInvalidFileSize?: () => void;
  onInvalidFileType?: () => void;
  selectedFile: File | null;
  uploadProgressPercent?: number;
}

const SIMULATED_UPLOAD_START_PROGRESS_PERCENT = 25;
const SIMULATED_UPLOAD_MAX_PROGRESS_PERCENT = 90;
const SIMULATED_UPLOAD_PROGRESS_STEP_PERCENT = 2;
const SIMULATED_UPLOAD_PROGRESS_INTERVAL_MILLISECONDS = 120;
const REAL_UPLOAD_PROGRESS_STALL_TIMEOUT_MILLISECONDS = 800;

/**
 * Clamps a numeric progress value to an integer in the [0, 100] range.
 *
 * @param progressPercent - The raw progress value.
 * @returns The normalized progress percent.
 */
function clampProgressPercent(progressPercent: number): number {
  return Math.max(0, Math.min(100, Math.round(progressPercent)));
}

/**
 * Renders a single-file receipt uploader with drag-and-drop and upload progress support.
 *
 * @param props - The component input props.
 * @returns The uploader UI with optional selected file preview and progress.
 */
export function ReceiptFileUploader({
  errorMessage,
  inputId,
  inputAriaLabel,
  isDisabled = false,
  isUploading = false,
  onFileChange,
  onInvalidFileSize,
  onInvalidFileType,
  selectedFile,
  uploadProgressPercent,
}: ReceiptFileUploaderProps) {
  const [simulatedProgressPercent, setSimulatedProgressPercent] = useState(0);
  const [currentTimestamp, setCurrentTimestamp] = useState(0);
  const [uploadStartTimestamp, setUploadStartTimestamp] = useState<number | null>(null);
  const [lastRealProgressEventTimestamp, setLastRealProgressEventTimestamp] = useState<number | null>(null);
  const lastRealProgressValueReference = useRef<number | null>(null);
  const wasUploadingReference = useRef(false);

  useEffect(() => {
    const currentTimestamp = Date.now();

    if (isUploading && !wasUploadingReference.current) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUploadStartTimestamp(currentTimestamp);
      setSimulatedProgressPercent(SIMULATED_UPLOAD_START_PROGRESS_PERCENT);
      setCurrentTimestamp(currentTimestamp);
      setLastRealProgressEventTimestamp(null);
      lastRealProgressValueReference.current = null;
    }

    if (!isUploading && wasUploadingReference.current) {
      setUploadStartTimestamp(null);
      setSimulatedProgressPercent(0);
      setCurrentTimestamp(currentTimestamp);
      setLastRealProgressEventTimestamp(null);
      lastRealProgressValueReference.current = null;
    }

    wasUploadingReference.current = isUploading;
  }, [isUploading]);

  useEffect(() => {
    if (!isUploading || typeof uploadProgressPercent !== "number") {
      return;
    }

    const normalizedRealProgressPercent = clampProgressPercent(uploadProgressPercent);

    if (lastRealProgressValueReference.current !== normalizedRealProgressPercent) {
      lastRealProgressValueReference.current = normalizedRealProgressPercent;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLastRealProgressEventTimestamp(Date.now());
    }
  }, [isUploading, uploadProgressPercent]);

  useEffect(() => {
    if (!isUploading) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setCurrentTimestamp(Date.now());
      setSimulatedProgressPercent((currentProgressPercent) =>
        Math.min(
          SIMULATED_UPLOAD_MAX_PROGRESS_PERCENT,
          Math.max(
            currentProgressPercent,
            SIMULATED_UPLOAD_START_PROGRESS_PERCENT,
          ) + SIMULATED_UPLOAD_PROGRESS_STEP_PERCENT,
        ));
    }, SIMULATED_UPLOAD_PROGRESS_INTERVAL_MILLISECONDS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isUploading]);

  const uploadHasStarted =
    isUploading &&
    typeof uploadStartTimestamp === "number" &&
    currentTimestamp >= uploadStartTimestamp;
  const realProgressPercent =
    typeof uploadProgressPercent === "number"
      ? clampProgressPercent(uploadProgressPercent)
      : null;
  const hasRecentRealProgressEvent =
    uploadHasStarted &&
    realProgressPercent !== null &&
    typeof lastRealProgressEventTimestamp === "number" &&
    currentTimestamp - lastRealProgressEventTimestamp <=
      REAL_UPLOAD_PROGRESS_STALL_TIMEOUT_MILLISECONDS;
  const effectiveProgressPercent = isUploading
    ? hasRecentRealProgressEvent && realProgressPercent !== null
      ? realProgressPercent
      : Math.max(
          simulatedProgressPercent,
          realProgressPercent ?? SIMULATED_UPLOAD_START_PROGRESS_PERCENT,
        )
    : 0;
  const hasUploadError = Boolean(errorMessage);

  return (
    <FileUpload.Root className="w-full min-w-0">
      <FileUpload.DropZone
        accept={RECEIPT_UPLOAD_ACCEPT_ATTRIBUTE}
        allowsMultiple={false}
        className="cursor-pointer bg-transparent ring-2 ring-emerald-500/90 [&_[data-featured-icon=true]]:text-white"
        dragAndDropLabel="o arrastrá y soltá"
        hint={RECEIPT_UPLOAD_HINT_TEXT}
        inputId={inputId}
        inputAriaLabel={inputAriaLabel}
        isDisabled={isDisabled}
        maxSize={RECEIPT_UPLOAD_MAX_SIZE_BYTES}
        uploadActionLabel="Hacé click para subir"
        uploadActionMobileSuffixLabel="desde tu equipo"
        onDropFiles={(files) => {
          onFileChange(files[0] ?? null);
        }}
        onDropUnacceptedFiles={() => {
          onInvalidFileType?.();
        }}
        onSizeLimitExceed={() => {
          onInvalidFileSize?.();
        }}
      />

      {selectedFile ? (
        <FileUpload.List className="w-full min-w-0">
          <FileUpload.ListItemProgressFill
            className="w-full min-w-0 bg-transparent ring-2 ring-emerald-500/90 [&>div:nth-child(2)]:ring-emerald-500/90 [&>div:nth-child(2)]:ring-2"
            failed={hasUploadError}
            isDeleteDisabled={isUploading}
            name={selectedFile.name}
            onDelete={() => {
              if (isUploading) {
                return;
              }
              onFileChange(null);
            }}
            progress={hasUploadError ? 0 : effectiveProgressPercent}
            size={selectedFile.size}
          />
        </FileUpload.List>
      ) : null}

      {errorMessage ? (
        <p className="text-sm text-destructive" role="alert">
          {errorMessage}
        </p>
      ) : null}
    </FileUpload.Root>
  );
}
