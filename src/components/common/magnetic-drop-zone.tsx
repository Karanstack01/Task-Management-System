"use client";

import {
  CheckCircleIcon,
  FileArrowUpIcon,
  FileIcon,
  FilePdfIcon,
  FileZipIcon,
  ImageSquareIcon,
  UploadSimpleIcon,
  XIcon,
} from "@phosphor-icons/react/dist/ssr";
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from "motion/react";
import {
  type ChangeEvent,
  type DragEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/utils";

const MAGNET_DISTANCE = 180;
const MAX_MAGNET_OFFSET = 10;
const MAGNET_SPRING = { damping: 24, mass: 0.65, stiffness: 280 };

export type MagneticDropZoneProps = {
  accept?: string;
  className?: string;
  maxSize?: number;
  multiple?: boolean;
  compact?: boolean;
  onFilesChange?: (files: File[]) => void;
  /** Optional upload action (e.g. for Cloudinary direct pipeline) */
  onUpload?: (file: File) => Promise<void> | void;
  uploading?: boolean;
  uploadProgress?: number;
};

function formatBytes(bytes: number) {
  if (bytes === 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB"];
  const unitIndex = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1
  );
  const value = bytes / 1024 ** unitIndex;

  return `${value >= 10 || unitIndex === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[unitIndex]}`;
}

function getFileIcon(file: File) {
  if (file.type.startsWith("image/")) {
    return ImageSquareIcon;
  }

  if (file.type === "application/pdf") {
    return FilePdfIcon;
  }

  if (file.type.includes("zip") || file.name.toLowerCase().endsWith(".zip")) {
    return FileZipIcon;
  }

  return FileIcon;
}

function isFileDrag(dataTransfer: DataTransfer | null) {
  return dataTransfer
    ? Array.from(dataTransfer.types).includes("Files")
    : false;
}

function acceptsFile(file: File, accept: string) {
  if (!accept.trim()) {
    return true;
  }

  const fileName = file.name.toLowerCase();
  const fileType = file.type.toLowerCase();

  return accept
    .split(",")
    .map((rule) => rule.trim().toLowerCase())
    .some((rule) => {
      if (rule.startsWith(".")) {
        return fileName.endsWith(rule);
      }

      if (rule.endsWith("/*")) {
        return fileType.startsWith(rule.slice(0, -1));
      }

      return fileType === rule;
    });
}

export function MagneticDropZone({
  accept = "image/*,.pdf,.zip,.xlsx,.docx",
  className,
  maxSize = 25 * 1024 * 1024,
  multiple = false,
  compact = false,
  onFilesChange,
  onUpload,
  uploading = false,
  uploadProgress = 0,
}: MagneticDropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const zoneRef = useRef<HTMLDivElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [isNear, setIsNear] = useState(false);
  const [isOver, setIsOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const shouldReduceMotion = useReducedMotion();
  const magnetX = useMotionValue(0);
  const magnetY = useMotionValue(0);
  const magnetScale = useMotionValue(1);
  const glowX = useMotionValue(0);
  const glowY = useMotionValue(0);
  const springX = useSpring(magnetX, MAGNET_SPRING);
  const springY = useSpring(magnetY, MAGNET_SPRING);
  const springScale = useSpring(magnetScale, MAGNET_SPRING);
  const springGlowX = useSpring(glowX, MAGNET_SPRING);
  const springGlowY = useSpring(glowY, MAGNET_SPRING);
  const transform = useMotionTemplate`translate3d(${springX}px, ${springY}px, 0) scale(${springScale})`;
  const glowTransform = useMotionTemplate`translate3d(${springGlowX}px, ${springGlowY}px, 0)`;

  const resetMagnet = useCallback(() => {
    magnetX.set(0);
    magnetY.set(0);
    magnetScale.set(1);
    glowX.set(0);
    glowY.set(0);
    setIsNear(false);
    setIsOver(false);
  }, [glowX, glowY, magnetScale, magnetX, magnetY]);

  useEffect(() => {
    function handleWindowDragOver(event: globalThis.DragEvent) {
      if (!isFileDrag(event.dataTransfer)) {
        return;
      }

      const zone = zoneRef.current;

      if (!zone) {
        return;
      }

      const rect = zone.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const distanceFromEdgeX = Math.max(
        Math.abs(event.clientX - centerX) - rect.width / 2,
        0
      );
      const distanceFromEdgeY = Math.max(
        Math.abs(event.clientY - centerY) - rect.height / 2,
        0
      );
      const distance = Math.hypot(distanceFromEdgeX, distanceFromEdgeY);
      const pointerIsOver =
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom;
      const proximity = Math.max(0, 1 - distance / MAGNET_DISTANCE);

      if (proximity === 0) {
        resetMagnet();
        return;
      }

      const deltaX = event.clientX - centerX;
      const deltaY = event.clientY - centerY;
      const pointerDistance = Math.max(Math.hypot(deltaX, deltaY), 1);
      const offset = pointerIsOver ? 0 : proximity * MAX_MAGNET_OFFSET;

      magnetX.set(shouldReduceMotion ? 0 : (deltaX / pointerDistance) * offset);
      magnetY.set(shouldReduceMotion ? 0 : (deltaY / pointerDistance) * offset);
      magnetScale.set(shouldReduceMotion ? 1 : pointerIsOver ? 1.025 : 1.01);
      glowX.set(shouldReduceMotion ? 0 : deltaX);
      glowY.set(shouldReduceMotion ? 0 : deltaY);
      setIsNear(true);
      setIsOver(pointerIsOver);
    }

    function handleDragEnd() {
      resetMagnet();
    }

    window.addEventListener("dragover", handleWindowDragOver);
    window.addEventListener("dragend", handleDragEnd);
    window.addEventListener("drop", handleDragEnd);

    return () => {
      window.removeEventListener("dragover", handleWindowDragOver);
      window.removeEventListener("dragend", handleDragEnd);
      window.removeEventListener("drop", handleDragEnd);
    };
  }, [
    glowX,
    glowY,
    magnetScale,
    magnetX,
    magnetY,
    resetMagnet,
    shouldReduceMotion,
  ]);

  const acceptFiles = useCallback(
    (incomingFiles: File[]) => {
      const nextFiles = multiple ? incomingFiles : incomingFiles.slice(0, 1);
      const unsupportedFile = nextFiles.find(
        (file) => !acceptsFile(file, accept)
      );
      const oversizedFile = nextFiles.find((file) => file.size > maxSize);

      if (unsupportedFile) {
        setFiles([]);
        setError(`${unsupportedFile.name} is not a supported file type.`);
        onFilesChange?.([]);
        return;
      }

      if (oversizedFile) {
        setFiles([]);
        setError(
          `${oversizedFile.name} is larger than ${formatBytes(maxSize)}.`
        );
        onFilesChange?.([]);
        return;
      }

      if (nextFiles.length === 0) {
        return;
      }

      setFiles(nextFiles);
      setError(null);
      onFilesChange?.(nextFiles);
    },
    [accept, maxSize, multiple, onFilesChange]
  );

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    acceptFiles(Array.from(event.dataTransfer.files));
    resetMagnet();
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    if (!isFileDrag(event.dataTransfer)) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    acceptFiles(Array.from(event.target.files ?? []));
    event.target.value = "";
  }

  function openFilePicker() {
    inputRef.current?.click();
  }

  function clearFiles() {
    setFiles([]);
    setError(null);
    onFilesChange?.([]);
  }

  const firstFile = files[0];
  const FileTypeIcon = firstFile ? getFileIcon(firstFile) : FileIcon;
  const title = isOver
    ? "Let go to add it"
    : isNear
      ? "Bring it closer"
      : "Drop deliverable proof here";

  return (
    <motion.div
      className={cn(
        "relative flex w-full flex-col items-center justify-center overflow-hidden rounded-2xl border text-center outline-none transition-[border-color,background-color] duration-200 [transition-timing-function:cubic-bezier(0.23,1,0.32,1)] select-none",
        compact ? "min-h-[124px] py-3.5 px-4" : "min-h-60 py-7 px-6",
        isOver
          ? "border-[#2357D6] bg-[#2357D6]/10 ring-2 ring-[#2357D6]/20 shadow-md"
          : isNear
            ? "border-[#2357D6]/60 bg-[#2357D6]/5 dark:bg-[#2357D6]/10 shadow-xs"
            : "border-black/[0.08] bg-white/70 dark:border-white/[0.12] dark:bg-[#16161A]/80 backdrop-blur-md shadow-xs hover:border-black/15 dark:hover:border-white/20",
        className
      )}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      ref={zoneRef}
      style={{
        transform: shouldReduceMotion ? undefined : transform,
      }}
    >
      <input
        accept={accept}
        className="hidden"
        multiple={multiple}
        onChange={handleInputChange}
        ref={inputRef}
        type="file"
      />

      <motion.div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute top-1/2 left-1/2 -mt-20 -ml-20 size-40 rounded-full bg-[#2357D6]/25 dark:bg-[#2357D6]/35 blur-3xl transition-opacity duration-200",
          isNear ? "opacity-100" : "opacity-0"
        )}
        style={{ transform: glowTransform }}
      />

      {firstFile ? (
        <div className="relative flex w-full flex-col items-center">
          <div className="flex size-12 items-center justify-center rounded-xl border border-blue-200 bg-blue-50 text-[#2357D6] shadow-xs dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-[#60A5FA]">
            <FileTypeIcon aria-hidden="true" size={24} weight="fill" />
          </div>
          <div className="mt-3.5 flex items-center gap-1.5">
            <CheckCircleIcon
              aria-hidden="true"
              className="text-emerald-500"
              size={16}
              weight="fill"
            />
            <p className="font-semibold text-[#111111] dark:text-white text-sm">
              {files.length === 1
                ? "Ready to upload"
                : `${files.length} files ready`}
            </p>
          </div>
          <p className="mt-1 max-w-full truncate text-xs font-medium text-[#666666] dark:text-neutral-400">
            {firstFile.name}
            {files.length > 1 ? ` +${files.length - 1}` : ""}
          </p>
          <p className="mt-0.5 font-mono text-[10px] text-[#86868B] dark:text-neutral-500 uppercase">
            {formatBytes(firstFile.size)}
          </p>

          {/* Action buttons */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            {!uploading ? (
              <>
                <button
                  className="flex h-8 cursor-pointer items-center gap-1.5 rounded-xl border border-black/[0.08] bg-white px-3 font-medium text-xs text-[#111111] transition-all hover:bg-black/[0.03] active:scale-[0.97] dark:border-white/[0.12] dark:bg-[#1E1E24] dark:text-white dark:hover:bg-[#25252D]"
                  onClick={openFilePicker}
                  type="button"
                >
                  <UploadSimpleIcon aria-hidden="true" size={14} weight="bold" />
                  Replace
                </button>
                <button
                  aria-label={`Remove ${firstFile.name}`}
                  className="flex h-8 cursor-pointer items-center gap-1.5 rounded-xl border border-black/[0.08] bg-white px-3 font-medium text-xs text-[#666666] transition-all hover:text-rose-600 hover:bg-black/[0.03] active:scale-[0.97] dark:border-white/[0.12] dark:bg-[#1E1E24] dark:text-neutral-400 dark:hover:text-rose-400 dark:hover:bg-[#25252D]"
                  onClick={clearFiles}
                  type="button"
                >
                  <XIcon aria-hidden="true" size={14} weight="bold" />
                  Remove
                </button>
                {onUpload && (
                  <button
                    className="flex h-8 cursor-pointer items-center gap-1.5 rounded-xl bg-[#111111] dark:bg-white text-white dark:text-[#111111] px-4 font-semibold text-xs transition-all hover:opacity-90 active:scale-[0.97] shadow-xs"
                    onClick={() => onUpload(firstFile)}
                    type="button"
                  >
                    <UploadSimpleIcon aria-hidden="true" size={14} weight="bold" />
                    Upload Proof
                  </button>
                )}
              </>
            ) : (
              <div className="w-48 space-y-1.5 py-1">
                <div className="h-2 w-full bg-black/[0.06] dark:bg-white/[0.1] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#2357D6] transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-[#666666] dark:text-neutral-400 font-medium">
                  <span>Uploading to Cloudinary...</span>
                  <span className="font-bold text-[#2357D6] dark:text-[#60A5FA]">
                    {uploadProgress}%
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <button
          className="relative flex cursor-pointer flex-col items-center rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-[#2357D6] focus-visible:ring-offset-2"
          onClick={openFilePicker}
          type="button"
        >
          <div
            className={cn(
              "flex items-center justify-center rounded-xl border border-black/[0.06] bg-black/[0.03] text-[#666666] shadow-xs transition-colors duration-200 dark:border-white/[0.1] dark:bg-white/[0.06] dark:text-neutral-300",
              compact ? "size-9" : "size-12",
              isOver && "border-blue-400 bg-blue-50 text-[#2357D6] dark:border-blue-700 dark:bg-blue-950/60 dark:text-[#60A5FA]"
            )}
          >
            <FileArrowUpIcon
              aria-hidden="true"
              className={cn(
                "transition-colors duration-200",
                isNear ? "text-[#2357D6] dark:text-[#60A5FA]" : ""
              )}
              size={compact ? 18 : 24}
              weight="fill"
            />
          </div>
          <p className={cn(
            "font-semibold text-[#111111] dark:text-white",
            compact ? "mt-2 text-xs" : "mt-3.5 text-sm"
          )}>
            {title}
          </p>
          <p className={cn(
            "text-[#86868B] dark:text-neutral-400",
            compact ? "mt-0.5 text-[11px]" : "mt-1 text-xs"
          )}>
            or click to browse · up to {formatBytes(maxSize)}
          </p>
        </button>
      )}

      {error ? (
        <p
          aria-live="polite"
          className="relative mt-3 text-rose-500 text-xs font-medium"
        >
          {error}
        </p>
      ) : null}
    </motion.div>
  );
}

export default MagneticDropZone;

