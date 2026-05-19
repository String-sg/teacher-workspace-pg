import { FileText, GripVertical, ImageIcon, Info, Loader2, Paperclip, X } from 'lucide-react';
import { useRef, useState, type Dispatch } from 'react';

import type { AttachmentUploadType } from '~/api/client';
import { uploadAttachment } from '~/api/client';
import {
  Badge,
  Button,
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from '~/components/ui';
import type { PostFormAction, UploadingFile } from '~/containers/CreatePostView';
import {
  ALLOWED_FILE_MIME,
  ALLOWED_PHOTO_MIME,
  formatFileSize,
  MAX_FILE_ITEMS,
  MAX_PHOTO_ITEMS,
  validateUploadFile,
  type UploadKind,
} from '~/helpers/attachments';
import { notify } from '~/lib/notify';
import { cn } from '~/lib/utils';

/** Maximum photos that can be flagged as gallery covers. */
const MAX_COVER_PHOTOS = 3;

interface AttachmentSectionProps {
  files: UploadingFile[];
  photos: UploadingFile[];
  dispatch: Dispatch<PostFormAction>;
  /**
   * Routes the `type` field on `preUploadValidation`. Announcements and
   * consent forms use distinct PG domain tags even though the wire shape is
   * the same.
   */
  kind: AttachmentUploadType;
}

function AttachmentSection({ files, photos, dispatch, kind }: AttachmentSectionProps) {
  return (
    <div className="space-y-6">
      <p className="font-medium">
        Attachments <span className="text-xs font-normal text-muted-foreground">(optional)</span>
      </p>
      <FilesSubSection items={files} dispatch={dispatch} uploadType={kind} />
      <PhotosSubSection items={photos} dispatch={dispatch} uploadType={kind} />
    </div>
  );
}

// ─── Shared upload logic ──────────────────────────────────────────────────────

async function runUpload(
  file: File,
  kind: UploadKind,
  currentCount: number,
  uploadType: AttachmentUploadType,
  dispatch: Dispatch<PostFormAction>,
  inputRef: React.RefObject<HTMLInputElement | null>,
): Promise<boolean> {
  const result = validateUploadFile(file, kind, currentCount);
  if (!result.ok) {
    notify.error(result.reason);
    return false;
  }
  const localId =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `upload-${Date.now()}-${Math.random()}`;

  dispatch({
    type: 'ADD_UPLOAD',
    kind,
    payload: { localId, name: file.name, size: file.size, mimeType: file.type },
  });

  void uploadAttachment(file, uploadType, (stage) => {
    dispatch({ type: 'UPDATE_UPLOAD', kind, localId, patch: { status: stage } });
  })
    .then(({ attachmentId, url }) => {
      dispatch({
        type: 'UPDATE_UPLOAD',
        kind,
        localId,
        patch: {
          status: 'ready',
          attachmentId,
          url,
          ...(kind === 'photo' ? { thumbnailUrl: url } : {}),
        },
      });
    })
    .catch((err: unknown) => {
      const message = err instanceof Error ? err.message : 'Upload failed.';
      dispatch({
        type: 'UPDATE_UPLOAD',
        kind,
        localId,
        patch: { status: 'error', error: message },
      });
    });

  if (inputRef.current) inputRef.current.value = '';
  return true;
}

// ─── Files sub-section (list design) ─────────────────────────────────────────

function FilesSubSection({
  items,
  dispatch,
  uploadType,
}: {
  items: UploadingFile[];
  dispatch: Dispatch<PostFormAction>;
  uploadType: AttachmentUploadType;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const readyCount = items.filter((i) => i.status === 'ready').length;
  const atCap = items.length >= MAX_FILE_ITEMS;

  const onPick = async (picked: FileList | null) => {
    if (!picked) return;
    const candidates = Array.from(picked);
    let accepted = 0;
    for (const file of candidates) {
      const ok = await runUpload(
        file,
        'file',
        items.length + accepted,
        uploadType,
        dispatch,
        inputRef,
      );
      if (ok) accepted += 1;
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-medium">Files</p>
          <Popover>
            <PopoverTrigger className="flex items-center text-muted-foreground/50 hover:text-muted-foreground">
              <Info className="h-3.5 w-3.5" />
            </PopoverTrigger>
            <PopoverContent side="right" sideOffset={6}>
              <PopoverHeader>
                <PopoverTitle>Accepted file types</PopoverTitle>
                <PopoverDescription>
                  PDF · Word (.docx) · Excel (.xlsx) · PowerPoint (.pptx)
                </PopoverDescription>
                <PopoverDescription>Max 5 MB per file</PopoverDescription>
              </PopoverHeader>
            </PopoverContent>
          </Popover>
        </div>
        <p className="text-xs text-muted-foreground">
          {readyCount}/{MAX_FILE_ITEMS}
        </p>
      </div>

      {items.length > 0 && (
        <ul className="space-y-2">
          {items.map((item) => (
            <FileRow
              key={item.localId}
              item={item}
              onRemove={() =>
                dispatch({ type: 'REMOVE_UPLOAD', kind: 'file', localId: item.localId })
              }
            />
          ))}
        </ul>
      )}

      {!atCap && (
        <DropZoneButton
          label="files"
          icon={<Paperclip className="h-5 w-5" />}
          hint={`Add up to ${MAX_FILE_ITEMS} files, less than 5 MB each.`}
          onTrigger={() => inputRef.current?.click()}
          onDrop={(files) => void onPick(files)}
        />
      )}

      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ALLOWED_FILE_MIME.join(',')}
        className="hidden"
        onChange={(e) => void onPick(e.target.files)}
      />
    </div>
  );
}

function FileRow({ item, onRemove }: { item: UploadingFile; onRemove: () => void }) {
  return (
    <li className="flex items-center gap-3 rounded-xl border p-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted text-muted-foreground">
        <FileText className="h-5 w-5" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{item.name}</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{formatFileSize(item.size)}</span>
          <span>·</span>
          <StatusChip item={item} />
        </div>
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground hover:text-destructive"
        aria-label={`Remove ${item.name}`}
        onClick={onRemove}
      >
        <X className="h-4 w-4" />
      </Button>
    </li>
  );
}

// ─── Photos sub-section (list design) ───────────────────────────────────────

function PhotosSubSection({
  items,
  dispatch,
  uploadType,
}: {
  items: UploadingFile[];
  dispatch: Dispatch<PostFormAction>;
  uploadType: AttachmentUploadType;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const dragFromRef = useRef<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  const readyCount = items.filter((i) => i.status === 'ready').length;
  const coverCount = items.filter((i) => i.isCover).length;
  const atCap = items.length >= MAX_PHOTO_ITEMS;

  const onPick = async (picked: FileList | null) => {
    if (!picked) return;
    const candidates = Array.from(picked);
    let accepted = 0;
    for (const file of candidates) {
      const ok = await runUpload(
        file,
        'photo',
        items.length + accepted,
        uploadType,
        dispatch,
        inputRef,
      );
      if (ok) accepted += 1;
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-medium">Photos</p>
          <Popover>
            <PopoverTrigger className="flex items-center text-muted-foreground/50 hover:text-muted-foreground">
              <Info className="h-3.5 w-3.5" />
            </PopoverTrigger>
            <PopoverContent side="right" sideOffset={6}>
              <PopoverHeader>
                <PopoverTitle>Accepted photo types</PopoverTitle>
                <PopoverDescription>JPEG · PNG · WebP</PopoverDescription>
                <PopoverDescription>Max 5 MB per photo</PopoverDescription>
              </PopoverHeader>
            </PopoverContent>
          </Popover>
        </div>
        <p className="text-xs text-muted-foreground">
          {readyCount}/{MAX_PHOTO_ITEMS}
        </p>
      </div>

      {items.length > 0 && (
        <ul className="space-y-2">
          {items.map((item, i) => (
            <li
              key={item.localId}
              className={cn(
                'transition-opacity duration-100',
                dragOverIdx === i && dragFromRef.current !== i && 'opacity-40',
              )}
              draggable
              onDragStart={(e) => {
                dragFromRef.current = i;
                e.dataTransfer.effectAllowed = 'move';
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverIdx(i);
              }}
              onDragLeave={() => setDragOverIdx(null)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOverIdx(null);
                const from = dragFromRef.current;
                dragFromRef.current = null;
                if (from !== null && from !== i) {
                  dispatch({ type: 'REORDER_PHOTOS', from, to: i });
                }
              }}
              onDragEnd={() => {
                dragFromRef.current = null;
                setDragOverIdx(null);
              }}
            >
              <PhotoRow
                item={item}
                coverCount={coverCount}
                onToggleCover={() => dispatch({ type: 'SET_COVER_PHOTO', localId: item.localId })}
                onRemove={() =>
                  dispatch({ type: 'REMOVE_UPLOAD', kind: 'photo', localId: item.localId })
                }
                onEnlarge={(src) => setLightboxSrc(src)}
              />
            </li>
          ))}
        </ul>
      )}

      {!atCap && (
        <DropZoneButton
          label="photos"
          icon={<ImageIcon className="h-5 w-5" />}
          hint={`Add up to ${MAX_PHOTO_ITEMS} photos, less than 5 MB each.`}
          onTrigger={() => inputRef.current?.click()}
          onDrop={(files) => void onPick(files)}
        />
      )}

      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ALLOWED_PHOTO_MIME.join(',')}
        className="hidden"
        onChange={(e) => void onPick(e.target.files)}
      />

      {/* Lightbox */}
      {lightboxSrc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setLightboxSrc(null)}
        >
          <img
            src={lightboxSrc}
            alt="Enlarged preview"
            className="max-h-[90vh] max-w-[90vw] rounded-xl object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            type="button"
            aria-label="Close preview"
            onClick={() => setLightboxSrc(null)}
            className="absolute top-4 right-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm hover:bg-white/25"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}
    </div>
  );
}

function PhotoRow({
  item,
  coverCount,
  onToggleCover,
  onRemove,
  onEnlarge,
}: {
  item: UploadingFile;
  coverCount: number;
  onToggleCover: () => void;
  onRemove: () => void;
  onEnlarge: (src: string) => void;
}) {
  const isReady = item.status === 'ready';
  const src = item.thumbnailUrl ?? item.url;
  const canToggleCover = isReady && (item.isCover || coverCount < MAX_COVER_PHOTOS);

  return (
    <div className="flex items-center gap-3 rounded-xl border p-3">
      {/* Drag handle */}
      <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-muted-foreground/40 active:cursor-grabbing" />

      {/* Thumbnail */}
      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted text-muted-foreground">
        {isReady && src ? (
          <img
            src={src}
            alt={item.name}
            className="h-full w-full cursor-zoom-in object-cover"
            onClick={() => onEnlarge(src)}
          />
        ) : item.status === 'error' ? (
          <ImageIcon className="h-5 w-5 text-destructive/60" />
        ) : (
          <Loader2 className="h-5 w-5 animate-spin" />
        )}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{item.name}</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{formatFileSize(item.size)}</span>
          <span>·</span>
          <StatusChip item={item} />
        </div>
      </div>

      {/* Cover toggle */}
      {isReady && (
        <button
          type="button"
          aria-label={item.isCover ? 'Unmark as cover' : 'Mark as cover'}
          disabled={!canToggleCover}
          onClick={onToggleCover}
          className={cn(
            'shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors',
            item.isCover
              ? 'bg-primary text-primary-foreground'
              : 'border border-border text-muted-foreground enabled:hover:border-primary/60 enabled:hover:text-primary disabled:opacity-40',
          )}
        >
          Cover
        </button>
      )}

      {/* Remove */}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
        aria-label={`Remove ${item.name}`}
        onClick={onRemove}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}

// ─── Shared drop zone ─────────────────────────────────────────────────────────

function DropZoneButton({
  label,
  icon,
  hint,
  onTrigger,
  onDrop,
}: {
  label: string;
  icon: React.ReactNode;
  hint: string;
  onTrigger: () => void;
  onDrop: (files: FileList) => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Add ${label}`}
      onClick={onTrigger}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ' ? onTrigger() : undefined)}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        if (e.dataTransfer.files.length > 0) onDrop(e.dataTransfer.files);
      }}
      className="flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-muted-foreground/25 py-4 text-muted-foreground transition-colors hover:border-muted-foreground/50 hover:bg-muted/30"
    >
      {icon}
      <p className="text-sm">Drop {label} here or click to add more</p>
      <p className="text-xs text-muted-foreground/60">{hint}</p>
    </div>
  );
}

// ─── Status chip (shared) ─────────────────────────────────────────────────────

function StatusChip({ item }: { item: UploadingFile }) {
  if (item.status === 'ready') {
    return <Badge variant="success">Ready</Badge>;
  }
  if (item.status === 'error') {
    return <Badge variant="destructive">{item.error ?? 'Failed'}</Badge>;
  }
  const label = item.status === 'verifying' ? 'Scanning…' : 'Uploading…';
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      <Loader2 className="h-3 w-3 animate-spin" />
      {label}
    </span>
  );
}

export { AttachmentSection };
export type { AttachmentSectionProps };
