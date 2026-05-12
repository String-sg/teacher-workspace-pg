import { generateHTML } from '@tiptap/react';
import {
  ArrowDown,
  ArrowUp,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FileText,
  ImageIcon,
  MapPin,
  MoreHorizontal,
  User,
  Users,
  ZoomIn,
} from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';

import type { PostFormState, UploadingFile } from '~/containers/CreatePostView';
import { formatFileSize } from '~/helpers/attachments';
import { formatDateTime, formatLocalDate, formatLocalDateTimeRange } from '~/helpers/dateTime';
import { createRichTextExtensions, extractTextFromTiptap } from '~/helpers/tiptap';
import { cn } from '~/lib/utils';

import { summariseRecipients } from './summarise-recipients';

// Built once — `generateHTML` only reads the schema, so the extensions never
// need a maxLength here (CharacterCount has no effect on static rendering).
const RICH_TEXT_EXTENSIONS = createRichTextExtensions();

/** Parent-facing display for each shortcut key — emoji + label matching the PG app. */
const SHORTCUT_PREVIEW: Record<string, { emoji: string; label: string }> = {
  TRAVEL_DECLARATION: { emoji: '✈️', label: 'Go to Travel Declaration' },
  EDIT_CONTACT_DETAILS: { emoji: '🧑', label: 'Go to Contact Details' },
};

type PreviewFocusSection =
  | 'header'
  | 'content'
  | 'attachments'
  | 'links'
  | 'questions'
  | 'response';

interface PostPreviewProps {
  formState: PostFormState;
  currentUserName?: string;
  defaultEnquiryEmail?: string;
  focusSection?: PreviewFocusSection;
}

const PostPreview = React.memo(function PostPreview({
  formState,
  currentUserName = 'Daniel Tan',
  defaultEnquiryEmail = 'enquiry@school.edu.sg',
  focusSection,
}: PostPreviewProps) {
  const {
    kind,
    title,
    description,
    descriptionDoc,
    responseType,
    questions,
    enquiryEmail,
    selectedRecipients,
    selectedStaff,
    websiteLinks,
    shortcuts,
    attachments,
    photos,
  } = formState;
  // Freeze the preview timestamp to the moment the component mounts so
  // `React.memo` short-circuits re-renders when form state is unchanged.
  const timestamp = useMemo(() => formatDateTime(new Date().toISOString(), { case: 'upper' }), []);
  // Serialize the Tiptap doc to HTML once per doc change; the editor holds the
  // JSON, we just re-render it statically with the same schema.
  const descriptionHtml = useMemo(() => {
    if (!descriptionDoc) return '';
    if (!extractTextFromTiptap(descriptionDoc)) return '';
    return generateHTML(descriptionDoc as Parameters<typeof generateHTML>[0], RICH_TEXT_EXTENSIONS);
  }, [descriptionDoc]);
  const hasContent = Boolean(title || description);
  const dimmedWhenEmpty = hasContent ? 'text-foreground' : 'text-muted-foreground/60';
  // Show the user's selection if set; fall back to the school's default so
  // the preview doesn't leak a real email before one is chosen.
  const enquiryContact = enquiryEmail || defaultEnquiryEmail;

  const isForm = kind === 'form';
  const titlePlaceholder = 'Title';
  const descriptionPlaceholder = 'Your post details will appear here.';

  const eventRange = isForm
    ? formatLocalDateTimeRange(formState.event?.start, formState.event?.end)
    : undefined;
  const venue = isForm ? formState.venue?.trim() || undefined : undefined;
  const dueDateLabel = isForm ? formatLocalDate(formState.dueDate) : undefined;

  // Recipient summary for the phone-frame slot. Each parent actually sees
  // their own child's name on PG; when no real child is known we show a
  // representative from the teacher's selection so the preview echoes the
  // configured audience. Empty selection keeps the muted placeholder.
  const recipientSummary = useMemo(
    () => summariseRecipients(selectedRecipients),
    [selectedRecipients],
  );

  const readyPhotos = useMemo(() => photos.filter((p) => p.status === 'ready'), [photos]);
  // Hero photo = first cover-marked photo, or first ready photo as fallback.
  const heroPhoto = useMemo(() => {
    const cover = readyPhotos.find((p) => p.isCover);
    return cover ?? readyPhotos[0] ?? null;
  }, [readyPhotos]);

  // Gallery state — lives in the PostPreview component so it resets on unmount.
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);

  const readyAttachments = useMemo(
    () => attachments.filter((a) => a.status === 'ready'),
    [attachments],
  );
  const validLinks = useMemo(
    () => websiteLinks.filter((l) => l.url.trim().length > 0 || l.title.trim().length > 0),
    [websiteLinks],
  );
  const enabledShortcuts = shortcuts.filter((key) => SHORTCUT_PREVIEW[key]);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Scroll the preview pane to the relevant section whenever the teacher's
  // focus moves to a different part of the form.
  useEffect(() => {
    if (!focusSection || !scrollContainerRef.current) return;
    const container = scrollContainerRef.current;
    const target = container.querySelector<HTMLElement>(`[data-section="${focusSection}"]`);
    if (!target) return;
    container.scrollTo({ top: target.offsetTop - 8, behavior: 'smooth' });
  }, [focusSection]);

  return (
    <div className="space-y-3">
      {/* relative so chrome overlay and gallery can use absolute positioning */}
      <div className="relative flex h-[580px] flex-col overflow-hidden rounded-[1.75rem] border-[7px] border-[#1a1f2e] bg-white">
        {/* Mobile chrome — always a frosted white bar so icons stay readable over any content */}
        <div className="absolute inset-x-0 top-0 z-10 flex shrink-0 items-center justify-between rounded-t-[1.3rem] bg-white px-4 py-2.5">
          <ChevronLeft className="h-4 w-4 text-foreground" strokeWidth={2} />
          <div className="flex items-center gap-3 text-foreground">
            <ArrowUp className="h-4 w-4" strokeWidth={2} />
            <ArrowDown className="h-4 w-4" strokeWidth={2} />
            <MoreHorizontal className="h-4 w-4" strokeWidth={2} />
          </div>
        </div>

        {/* pt-10 reserves space for the absolute chrome bar when there's no hero photo overlay */}
        <div
          ref={scrollContainerRef}
          className={cn('flex flex-1 flex-col overflow-y-auto', !heroPhoto && 'pt-10')}
        >
          {/* Hero photo — full width, overlapped by chrome above, click to open gallery */}
          {heroPhoto && (
            <button
              type="button"
              className="group relative shrink-0 cursor-pointer overflow-hidden border-0 p-0"
              onClick={() => {
                setGalleryOpen(true);
                setGalleryIndex(0);
              }}
              aria-label="Open photo gallery"
            >
              <PreviewPhoto photo={heroPhoto} large />
              {/* Badge: bottom-right, zoom-in icon + count */}
              {readyPhotos.length > 1 && (
                <div className="absolute right-3 bottom-3 flex items-center gap-1.5 rounded-full bg-black/65 px-3 py-1.5 text-[13px] font-semibold text-white backdrop-blur-sm">
                  <ZoomIn className="h-4 w-4" strokeWidth={2} />
                  {readyPhotos.length} photos
                </div>
              )}
            </button>
          )}

          {/* Padded content below the photo */}
          <div className="flex flex-1 flex-col px-5 pb-5">
            <div data-section="header" className="space-y-0.5 pt-4">
              <p className={`text-lg leading-tight font-semibold ${dimmedWhenEmpty}`}>
                {title || titlePlaceholder}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {timestamp} · {currentUserName.toUpperCase()}
              </p>
            </div>

            <div
              className={`mt-2 flex items-center gap-1.5 text-[11px] font-medium tracking-wider uppercase ${
                recipientSummary ? 'text-foreground' : 'text-muted-foreground/60'
              }`}
            >
              <User className="h-3 w-3" strokeWidth={2.25} />
              {recipientSummary ?? 'STUDENT NAME'}
            </div>

            {/* Venue + event range — inline rows directly under student name, matching PG app */}
            {isForm && venue && (
              <div className="mt-1 flex items-start gap-1.5 text-[11px] text-foreground">
                <MapPin className="mt-px h-3 w-3 shrink-0 text-muted-foreground" strokeWidth={2} />
                <span>{venue}</span>
              </div>
            )}
            {isForm && eventRange && (
              <div className="mt-1 flex items-start gap-1.5 text-[11px] font-medium text-primary">
                <CalendarClock className="mt-px h-3 w-3 shrink-0 text-primary" strokeWidth={2} />
                <span>{eventRange}</span>
              </div>
            )}

            <div className="mt-4 border-t border-border/40" />

            <div data-section="content" className="mt-4 space-y-2">
              <p className="text-[11px] font-medium tracking-widest text-muted-foreground uppercase">
                Details
              </p>
              {descriptionHtml ? (
                <div
                  className="rich-content"
                  // `generateHTML` serializes a trusted Tiptap schema; Link is
                  // constrained to http/https/mailto via createRichTextExtensions.
                  dangerouslySetInnerHTML={{ __html: descriptionHtml }}
                />
              ) : description ? (
                <p className="text-sm whitespace-pre-wrap text-foreground">{description}</p>
              ) : (
                <p className="text-sm text-muted-foreground/60">{descriptionPlaceholder}</p>
              )}
            </div>

            {/* Shortcuts — divider + tall button rows with trailing chevron, matching PG app */}
            {enabledShortcuts.length > 0 && (
              <>
                <div className="mt-4 border-t border-border/40" />
                <div data-section="shortcuts" className="mt-4 space-y-2.5">
                  <p className="text-[11px] font-medium tracking-widest text-muted-foreground uppercase">
                    Shortcuts
                  </p>
                  <ul className="space-y-2">
                    {enabledShortcuts.map((key) => {
                      const meta = SHORTCUT_PREVIEW[key]!;
                      return (
                        <li
                          key={key}
                          className="flex items-center gap-3 rounded-2xl border bg-background px-4 py-3.5"
                        >
                          <span className="text-lg leading-none">{meta.emoji}</span>
                          <span className="flex-1 text-sm font-medium">{meta.label}</span>
                          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </>
            )}

            {/* Links — divider + tall button rows: title bold + URL below in blue */}
            {validLinks.length > 0 && (
              <>
                <div className="mt-4 border-t border-border/40" />
                <div data-section="links" className="mt-4 space-y-2.5">
                  <p className="text-[11px] font-medium tracking-widest text-muted-foreground uppercase">
                    Links
                  </p>
                  <ul className="space-y-2">
                    {validLinks.map((link, i) => (
                      // eslint-disable-next-line react/no-array-index-key
                      <li
                        key={i}
                        className="flex items-center gap-3 rounded-2xl border bg-background px-4 py-3.5"
                      >
                        <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {link.title.trim() || link.url.trim() || 'Untitled link'}
                          </p>
                          {link.url.trim() && link.title.trim() && (
                            <p className="truncate text-xs text-primary">{link.url.trim()}</p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}

            {/* Attachments — divider + tall button rows: filename bold + size below */}
            {readyAttachments.length > 0 && (
              <>
                <div className="mt-4 border-t border-border/40" />
                <div data-section="attachments" className="mt-4 space-y-2.5">
                  <p className="text-[11px] font-medium tracking-widest text-muted-foreground uppercase">
                    Attachments
                  </p>
                  <ul className="space-y-2">
                    {readyAttachments.map((f) => (
                      <li
                        key={f.localId}
                        className="flex items-center gap-3 rounded-2xl border bg-background px-4 py-3.5"
                      >
                        <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{f.name}</p>
                          <p className="text-xs text-muted-foreground">{formatFileSize(f.size)}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}

            {questions.length > 0 && (
              <div data-section="questions" className="mt-5 space-y-4 border-t pt-4">
                {questions.map((q, i) => (
                  <div key={q.id} className="space-y-2">
                    {/* Question label */}
                    <div>
                      <p className="text-sm font-semibold">
                        <span className="text-destructive">* </span>
                        {i + 1}. {q.text || 'Untitled question'}
                      </p>
                      {q.description && (
                        <p className="mt-0.5 text-xs text-muted-foreground">{q.description}</p>
                      )}
                    </div>
                    {/* MCQ options */}
                    {q.type === 'mcq' && q.options.length > 0 && (
                      <ul className="space-y-1.5">
                        {q.options.map((opt, oi) => (
                          <li
                            key={oi}
                            className="flex items-center gap-2.5 rounded-lg border bg-background px-3 py-2 text-xs"
                          >
                            <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border border-muted-foreground/40" />
                            <span className={opt ? 'text-foreground' : 'text-muted-foreground/50'}>
                              {opt || `Option ${oi + 1}`}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                    {/* Free-text answer area */}
                    {q.type === 'free-text' && (
                      <div className="rounded-lg border bg-muted/30 px-3 py-2 text-xs text-muted-foreground/60">
                        Your answer here…
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Enquiry contact */}
            <div className="mt-auto pt-6 text-center">
              <p className="text-[11px] text-muted-foreground italic">
                For enquiries on this post, please contact
              </p>
              <p className="text-[11px] text-primary italic">{enquiryContact}</p>
            </div>
          </div>
          {/* /px-5 pb-5 */}
        </div>
        {/* /overflow-y-auto */}

        {/* Response bar — sticky to bottom of phone frame, outside the scroll area */}
        {isForm && (responseType === 'acknowledge' || responseType === 'yes-no') && (
          <div
            data-section="response"
            className="flex shrink-0 items-center justify-between gap-3 border-t border-border/40 bg-white px-5 py-3"
          >
            {/* Left: label + due date */}
            <div className="min-w-0">
              <p className="text-[10px] text-muted-foreground">
                {responseType === 'acknowledge' ? 'Please acknowledge by' : 'Please respond by'}
              </p>
              <p className="text-xs font-semibold text-foreground">{dueDateLabel ?? '—'}</p>
            </div>
            {/* Right: action buttons */}
            {responseType === 'yes-no' && (
              <div className="flex shrink-0 gap-1.5">
                <button
                  disabled
                  className="rounded-full bg-muted px-3 py-1.5 text-[11px] font-medium text-foreground"
                >
                  Yes
                </button>
                <button
                  disabled
                  className="rounded-full border border-border px-3 py-1.5 text-[11px] font-medium text-foreground"
                >
                  No
                </button>
              </div>
            )}
            {responseType === 'acknowledge' && (
              <button
                disabled
                className="shrink-0 rounded-full bg-[#c9826b] px-4 py-1.5 text-[11px] font-medium text-white"
              >
                Acknowledge
              </button>
            )}
          </div>
        )}

        {/* ── Gallery overlay ─────────────────────────────────────────────── */}
        {galleryOpen && readyPhotos.length > 0 && (
          <div className="absolute inset-0 z-10 flex flex-col bg-black">
            {/* Top bar */}
            <div className="flex shrink-0 items-center px-3 pt-3 pb-2">
              <button
                type="button"
                aria-label="Close gallery"
                onClick={() => setGalleryOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-white/80 hover:text-white"
              >
                <ChevronLeft className="h-5 w-5" strokeWidth={2} />
              </button>
              <span className="mx-auto text-sm font-medium text-white">
                {galleryIndex + 1} / {readyPhotos.length}
              </span>
              {/* Balance spacer */}
              <div className="h-8 w-8" />
            </div>

            {/* Image */}
            <div className="relative flex flex-1 items-center justify-center overflow-hidden">
              <GalleryPhoto photo={readyPhotos[galleryIndex]!} />

              {/* Prev */}
              {galleryIndex > 0 && (
                <button
                  type="button"
                  aria-label="Previous photo"
                  onClick={() => setGalleryIndex((i) => i - 1)}
                  className="absolute left-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25"
                >
                  <ChevronLeft className="h-4 w-4" strokeWidth={2} />
                </button>
              )}

              {/* Next */}
              {galleryIndex < readyPhotos.length - 1 && (
                <button
                  type="button"
                  aria-label="Next photo"
                  onClick={() => setGalleryIndex((i) => i + 1)}
                  className="absolute right-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25"
                >
                  <ChevronRight className="h-4 w-4" strokeWidth={2} />
                </button>
              )}
            </div>

            {/* Dots */}
            <div className="flex shrink-0 items-center justify-center gap-1.5 py-5">
              {readyPhotos.map((_, i) => (
                <button
                  // eslint-disable-next-line react/no-array-index-key
                  key={i}
                  type="button"
                  aria-label={`Go to photo ${i + 1}`}
                  onClick={() => setGalleryIndex(i)}
                  className={cn(
                    'h-1.5 rounded-full bg-white transition-all duration-200',
                    i === galleryIndex ? 'w-5 opacity-100' : 'w-1.5 opacity-40',
                  )}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Teacher-facing footer: staff-in-charge isn't shown in the parent app,
          but teachers need to verify their selection at a glance. */}
      {selectedStaff.length > 0 && (
        <div className="flex items-start gap-2 rounded-xl bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          <Users className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <div className="flex flex-wrap gap-x-1.5">
            <span className="font-medium text-foreground">Staff-in-charge:</span>
            {selectedStaff.map((s, i) => (
              <span key={s.id}>
                {s.label}
                {i < selectedStaff.length - 1 ? ',' : ''}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

function PreviewPhoto({ photo, large = false }: { photo: UploadingFile; large?: boolean }) {
  const [failed, setFailed] = useState(false);
  const src = photo.thumbnailUrl ?? photo.url;

  React.useEffect(() => {
    setFailed(false);
  }, [src]);

  if (failed || !src) {
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-white text-muted-foreground',
          large ? 'aspect-video w-full' : 'aspect-square rounded-lg',
        )}
      >
        <ImageIcon className="h-5 w-5" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={photo.name}
      loading="lazy"
      onError={() => setFailed(true)}
      // Hero variant: no rounding — the photo is edge-to-edge inside the phone frame.
      className={cn(
        'object-cover',
        large ? 'aspect-video w-full' : 'aspect-square w-full rounded-lg',
      )}
    />
  );
}

/** Full-size image for the gallery overlay. Renders with object-contain so the
 *  photo is fully visible against the black background regardless of orientation. */
function GalleryPhoto({ photo }: { photo: UploadingFile }) {
  const [failed, setFailed] = useState(false);
  const src = photo.thumbnailUrl ?? photo.url;

  React.useEffect(() => {
    setFailed(false);
  }, [src]);

  if (failed || !src) {
    return (
      <div className="flex h-full w-full items-center justify-center text-white/30">
        <ImageIcon className="h-8 w-8" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={photo.name}
      loading="lazy"
      onError={() => setFailed(true)}
      className="max-h-full max-w-full object-contain"
    />
  );
}

export { PostPreview };
export type { PostPreviewProps };
