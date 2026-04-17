"use client";

import type { ComponentProps, ComponentPropsWithRef } from "react";
import { useId, useRef, useState } from "react";
import type { FileIcon } from "@untitledui/file-icons";
import { FileIcon as FileTypeIcon } from "@untitledui/file-icons";
import { CheckCircle, Trash01, UploadCloud02, XCircle } from "@untitledui/icons";
import { AnimatePresence, motion } from "motion/react";
import { Button } from "@/components/base/buttons/button";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { ProgressBar } from "@/components/base/progress-indicators/progress-indicators";
import { FeaturedIcon } from "@/components/foundations/featured-icon/featured-icon";
import { cx } from "@/lib/utils/cx";

/**
 * Returns a human-readable file size.
 * @param bytes - The size of the file in bytes.
 * @returns A string representing the file size in a human-readable format.
 */
export const getReadableFileSize = (bytes: number) => {
    if (bytes === 0) return "0 KB";

    const suffixes = ["B", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];

    const i = Math.floor(Math.log(bytes) / Math.log(1024));

    return Math.floor(bytes / Math.pow(1024, i)) + " " + suffixes[i];
};

interface FileUploadDropZoneProps {
    /** The class name of the drop zone. */
    className?: string;
    /**
     * A hint text explaining what files can be dropped.
     */
    hint?: string;
    /**
     * Disables dropping or uploading files.
     */
    isDisabled?: boolean;
    /**
     * Specifies the types of files that the server accepts.
     * Examples: "image/*", ".pdf,image/*", "image/*,video/mpeg,application/pdf"
     */
    accept?: string;
    /**
     * Allows multiple file uploads.
     */
    allowsMultiple?: boolean;
    /**
     * Maximum file size in bytes.
     */
    maxSize?: number;
    /**
     * Callback function that is called with the list of dropped files
     * when files are dropped on the drop zone.
     */
    onDropFiles?: (files: File[]) => void;
    /**
     * Callback function that is called with the list of unaccepted files
     * when files are dropped on the drop zone.
     */
    onDropUnacceptedFiles?: (files: File[]) => void;
    /**
     * Callback function that is called with the list of files that exceed
     * the size limit when files are dropped on the drop zone.
     */
    onSizeLimitExceed?: (files: File[]) => void;
    /**
     * Sets an explicit aria-label for the file input control.
     */
    inputAriaLabel?: string;
    /**
     * Sets an explicit id for the hidden file input control.
     */
    inputId?: string;
    /**
     * Overrides the primary action label displayed in the drop zone.
     */
    uploadActionLabel?: string;
    /**
     * Overrides the drag and drop helper label displayed next to the action.
     */
    dragAndDropLabel?: string;
    /**
     * Overrides the mobile-only suffix displayed next to the upload action.
     */
    uploadActionMobileSuffixLabel?: string;
}

const MIME_TYPE_EXTENSION_FALLBACKS: Record<string, string[]> = {
    "application/pdf": [".pdf"],
    "audio/mpeg": [".mp3"],
    "image/gif": [".gif"],
    "image/heic": [".heic"],
    "image/heif": [".heif"],
    "image/jpeg": [".jpg", ".jpeg"],
    "image/png": [".png"],
    "image/webp": [".webp"],
    "text/plain": [".txt"],
    "video/mp4": [".mp4"],
};

const WILDCARD_MIME_PREFIX_EXTENSION_FALLBACKS: Record<string, string[]> = {
    audio: [".aac", ".flac", ".m4a", ".mp3", ".ogg", ".wav"],
    image: [".avif", ".bmp", ".gif", ".heic", ".heif", ".jpeg", ".jpg", ".png", ".svg", ".webp"],
    text: [".csv", ".md", ".txt"],
    video: [".avi", ".m4v", ".mov", ".mp4", ".mkv", ".webm"],
};

/**
 * Extracts the lowercase extension from a file name.
 *
 * @param fileName - The file name.
 * @returns The extension with leading dot, or null when unavailable.
 */
const getFileExtension = (fileName: string): string | null => {
    const fileNameParts = fileName.split(".");
    const extension = fileNameParts.length > 1 ? fileNameParts.pop() : null;

    if (!extension) {
        return null;
    }

    return `.${extension.toLowerCase()}`;
};

export const FileUploadDropZone = ({
    className,
    hint,
    isDisabled,
    accept,
    allowsMultiple = true,
    maxSize,
    onDropFiles,
    onDropUnacceptedFiles,
    onSizeLimitExceed,
    inputAriaLabel,
    inputId,
    uploadActionLabel,
    dragAndDropLabel,
    uploadActionMobileSuffixLabel,
}: FileUploadDropZoneProps) => {
    const generatedInputId = useId();
    const resolvedInputId = inputId ?? generatedInputId;
    const inputRef = useRef<HTMLInputElement>(null);
    const [isInvalid, setIsInvalid] = useState(false);
    const [isDraggingOver, setIsDraggingOver] = useState(false);

    const isFileTypeAccepted = (file: File): boolean => {
        if (!accept) return true;

        // Split the accept string into individual types
        const acceptedTypes = accept.split(",").map((type) => type.trim());
        const fileExtension = getFileExtension(file.name);
        const normalizedFileType = file.type.toLowerCase();
        const hasMimeType = normalizedFileType.length > 0;

        return acceptedTypes.some((acceptedType) => {
            const normalizedAcceptedType = acceptedType.toLowerCase();

            // Handle file extensions (e.g., .pdf, .doc)
            if (normalizedAcceptedType.startsWith(".")) {
                return fileExtension === normalizedAcceptedType;
            }

            // Handle wildcards (e.g., image/*)
            if (normalizedAcceptedType.endsWith("/*")) {
                const typePrefix = normalizedAcceptedType.split("/")[0];

                if (hasMimeType) {
                    return normalizedFileType.startsWith(`${typePrefix}/`);
                }

                return Boolean(
                    fileExtension &&
                        WILDCARD_MIME_PREFIX_EXTENSION_FALLBACKS[typePrefix]?.includes(fileExtension),
                );
            }

            // Handle exact MIME types (e.g., application/pdf)
            if (hasMimeType) {
                return (
                    normalizedFileType === normalizedAcceptedType ||
                    Boolean(
                        fileExtension &&
                            MIME_TYPE_EXTENSION_FALLBACKS[normalizedAcceptedType]?.includes(
                                fileExtension,
                            ),
                    )
                );
            }

            return Boolean(
                fileExtension &&
                    MIME_TYPE_EXTENSION_FALLBACKS[normalizedAcceptedType]?.includes(fileExtension),
            );
        });
    };

    const handleDragIn = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();

        if (isDisabled) return;

        setIsDraggingOver(true);
    };

    const handleDragOut = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();

        if (isDisabled) return;

        setIsDraggingOver(false);
    };

    const processFiles = (files: File[]): void => {
        // Reset the invalid state when processing files.
        setIsInvalid(false);

        const acceptedFiles: File[] = [];
        const unacceptedFiles: File[] = [];
        const oversizedFiles: File[] = [];

        // If multiple files are not allowed, only process the first file
        const filesToProcess = allowsMultiple ? files : files.slice(0, 1);

        filesToProcess.forEach((file) => {
            // Check file size first
            if (maxSize && file.size > maxSize) {
                oversizedFiles.push(file);
                return;
            }

            // Then check file type
            if (isFileTypeAccepted(file)) {
                acceptedFiles.push(file);
            } else {
                unacceptedFiles.push(file);
            }
        });

        const hasInvalidFiles = oversizedFiles.length > 0 || unacceptedFiles.length > 0;

        if (hasInvalidFiles) {
            setIsInvalid(true);
        }

        // Handle oversized files
        if (oversizedFiles.length > 0 && typeof onSizeLimitExceed === "function") {
            onSizeLimitExceed(oversizedFiles);
        }

        // Handle accepted files
        if (acceptedFiles.length > 0 && typeof onDropFiles === "function") {
            onDropFiles(acceptedFiles);
        }

        // Handle unaccepted files
        if (unacceptedFiles.length > 0 && typeof onDropUnacceptedFiles === "function") {
            onDropUnacceptedFiles(unacceptedFiles);
        }

        // Clear the input value to ensure the same file can be selected again
        if (inputRef.current) {
            inputRef.current.value = "";
        }
    };

    const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();

        if (isDisabled) return;

        setIsDraggingOver(false);
        processFiles(Array.from(event.dataTransfer.files));
    };

    const handleInputFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        processFiles(Array.from(event.target.files || []));
    };

    const handleDropZoneClick = () => {
        if (isDisabled) {
            return;
        }

        inputRef.current?.click();
    };

    return (
        <div
            data-dropzone
            onClick={handleDropZoneClick}
            onDragOver={handleDragIn}
            onDragEnter={handleDragIn}
            onDragLeave={handleDragOut}
            onDragEnd={handleDragOut}
            onDrop={handleDrop}
            className={cx(
                "relative flex flex-col items-center gap-3 rounded-xl bg-primary px-6 py-4 text-tertiary ring-1 ring-secondary transition duration-100 ease-linear ring-inset",
                isDraggingOver && "ring-2 ring-brand",
                isDisabled && "cursor-not-allowed bg-secondary",
                className,
            )}
        >
            <FeaturedIcon icon={UploadCloud02} color="gray" theme="modern" size="md" className={cx(isDisabled && "opacity-50")} />

            <div className="flex flex-col gap-1 text-center">
                <div className="flex justify-center gap-1 text-center">
                    <input
                        ref={inputRef}
                        id={resolvedInputId}
                        type="file"
                        className="peer sr-only"
                        disabled={isDisabled}
                        aria-label={inputAriaLabel}
                        accept={accept}
                        multiple={allowsMultiple}
                        onChange={handleInputFileChange}
                    />
                    <label htmlFor={resolvedInputId} className="flex cursor-pointer">
                        <Button color="link-color" size="md" isDisabled={isDisabled} onClick={() => inputRef.current?.click()}>
                            {uploadActionLabel ?? "Click to upload"}{" "}
                            <span className="md:hidden">{uploadActionMobileSuffixLabel ?? "and attach files"}</span>
                        </Button>
                    </label>
                    <span className="text-sm max-md:hidden">{dragAndDropLabel ?? "or drag and drop"}</span>
                </div>
                <p className={cx("text-xs transition duration-100 ease-linear", isInvalid && "text-error-primary")}>
                    {hint || "SVG, PNG, JPG or GIF (max. 800x400px)"}
                </p>
            </div>
        </div>
    );
};

export interface FileListItemProps {
    /** The name of the file. */
    name: string;
    /** The size of the file. */
    size: number;
    /** The upload progress of the file. */
    progress: number;
    /** Whether the file failed to upload. */
    failed?: boolean;
    /** The type of the file. */
    type?: ComponentProps<typeof FileIcon>["type"];
    /** The class name of the file list item. */
    className?: string;
    /** The variant of the file icon. */
    fileIconVariant?: ComponentProps<typeof FileTypeIcon>["variant"];
    /** The function to call when the file is deleted. */
    onDelete?: () => void;
    /** Disables the delete action button. */
    isDeleteDisabled?: boolean;
    /** The function to call when the file upload is retried. */
    onRetry?: () => void;
}

export const FileListItemProgressBar = ({ name, size, progress, failed, type, fileIconVariant, onDelete, isDeleteDisabled, onRetry, className }: FileListItemProps) => {
    const isComplete = progress === 100;

    return (
        <motion.li
            layout="position"
            className={cx(
                "relative flex w-full min-w-0 gap-3 rounded-xl bg-primary p-4 ring-1 ring-secondary transition-shadow duration-100 ease-linear ring-inset",
                failed && "ring-2 ring-error",
                className,
            )}
        >
            <FileTypeIcon className="size-10 shrink-0 dark:hidden" type={type ?? "empty"} theme="light" variant={fileIconVariant ?? "default"} />
            <FileTypeIcon className="size-10 shrink-0 not-dark:hidden" type={type ?? "empty"} theme="dark" variant={fileIconVariant ?? "default"} />

            <div className="flex min-w-0 flex-1 flex-col items-start">
                <div className="flex w-full max-w-full min-w-0 flex-1">
                    <div className="min-w-0 flex-1">
                        <p className="max-w-full break-words text-sm font-medium text-primary">{name}</p>

                        <div className="mt-0.5 flex items-center gap-2">
                            <p className="truncate text-sm whitespace-nowrap text-tertiary">{getReadableFileSize(size)}</p>

                            <hr className="h-3 w-px rounded-t-full rounded-b-full border-none bg-border-primary" />

                            <div className="flex items-center gap-1">
                                {isComplete && <CheckCircle className="size-4 stroke-[2.5px] text-fg-success-primary" />}
                                {isComplete && <p className="text-sm font-medium text-success-primary">Complete</p>}

                                {!isComplete && !failed && <UploadCloud02 className="size-4 stroke-[2.5px] text-fg-quaternary" />}
                                {!isComplete && !failed && <p className="text-sm font-medium text-quaternary">Uploading...</p>}

                                {failed && <XCircle className="size-4 text-fg-error-primary" />}
                                {failed && <p className="text-sm font-medium text-error-primary">Failed</p>}
                            </div>
                        </div>
                    </div>

                    <ButtonUtility color="tertiary" tooltip="Delete" icon={Trash01} size="xs" className="-mt-2 -mr-2 self-start" isDisabled={isDeleteDisabled} onClick={onDelete} />
                </div>

                {!failed && (
                    <div className="mt-1 w-full">
                        <ProgressBar labelPosition="right" max={100} min={0} value={progress} />
                    </div>
                )}

                {failed && onRetry && (
                    <Button color="link-destructive" size="sm" onClick={onRetry} className="mt-1.5">
                        Try again
                    </Button>
                )}
            </div>
        </motion.li>
    );
};

export const FileListItemProgressFill = ({ name, size, progress, failed, type, fileIconVariant, onDelete, isDeleteDisabled, onRetry, className }: FileListItemProps) => {
    const isComplete = progress === 100;

    return (
        <motion.li layout="position" className={cx("relative flex w-full min-w-0 gap-3 overflow-hidden rounded-xl bg-primary p-4", className)}>
            {/* Progress fill. */}
            <div
                style={{ transform: `translateX(-${100 - progress}%)` }}
                className={cx("absolute inset-0 size-full bg-secondary transition duration-75 ease-linear", isComplete && "opacity-0")}
                role="progressbar"
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
            />
            {/* Inner ring. */}
            <div
                className={cx(
                    "absolute inset-0 size-full rounded-[inherit] ring-1 ring-secondary transition duration-100 ease-linear ring-inset",
                    failed && "ring-2 ring-error",
                )}
            />
            <FileTypeIcon className="relative size-10 shrink-0 dark:hidden" type={type ?? "empty"} theme="light" variant={fileIconVariant ?? "solid"} />
            <FileTypeIcon className="relative size-10 shrink-0 not-dark:hidden" type={type ?? "empty"} theme="dark" variant={fileIconVariant ?? "solid"} />

            <div className="relative flex min-w-0 flex-1">
                <div className="relative flex min-w-0 flex-1 flex-col items-start">
                    <div className="w-full min-w-0 flex-1">
                        <p className="max-w-full break-words text-sm font-medium text-primary">{name}</p>

                        <div className="mt-0.5 flex items-center gap-2">
                            <p className="text-sm text-tertiary">{failed ? "Upload failed, please try again" : getReadableFileSize(size)}</p>

                            {!failed && (
                                <>
                                    <hr className="h-3 w-px rounded-t-full rounded-b-full border-none bg-border-primary" />
                                    <div className="flex items-center gap-1">
                                        {isComplete && <CheckCircle className="size-4 stroke-[2.5px] text-fg-success-primary" />}
                                        {!isComplete && <UploadCloud02 className="size-4 stroke-[2.5px] text-fg-quaternary" />}

                                        <p className="text-sm text-tertiary">{progress}%</p>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {failed && onRetry && (
                        <Button color="link-destructive" size="sm" onClick={onRetry} className="mt-1.5">
                            Try again
                        </Button>
                    )}
                </div>

                <ButtonUtility color="tertiary" tooltip="Delete" icon={Trash01} size="xs" className="-mt-2 -mr-2 self-start" isDisabled={isDeleteDisabled} onClick={onDelete} />
            </div>
        </motion.li>
    );
};

const FileUploadRoot = (props: ComponentPropsWithRef<"div">) => (
    <div {...props} className={cx("flex w-full min-w-0 flex-col gap-4", props.className)}>
        {props.children}
    </div>
);

const FileUploadList = (props: ComponentPropsWithRef<"ul">) => (
    <ul {...props} className={cx("flex w-full min-w-0 flex-col gap-3", props.className)}>
        <AnimatePresence initial={false}>{props.children}</AnimatePresence>
    </ul>
);

export const FileUpload = {
    Root: FileUploadRoot,
    List: FileUploadList,
    DropZone: FileUploadDropZone,
    ListItemProgressBar: FileListItemProgressBar,
    ListItemProgressFill: FileListItemProgressFill,
};
