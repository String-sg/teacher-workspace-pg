import { Bell, CalendarClock, CalendarDays, HelpCircle, MapPin, Paperclip } from 'lucide-react';
import { useState } from 'react';

import type { PGApiSchoolStaff } from '~/api/types';
import { StaffSelector } from '~/components/comms/staff-selector';
import { EnquiryEmailSelector } from '~/components/posts/EnquiryEmailSelector';
import {
  Card,
  CardContent,
  Separator,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '~/components/ui';
import type { PGConsentFormPost, PGPost, ReminderConfig } from '~/data/mock-pg-announcements';
import { formatDate, formatDateTime } from '~/helpers/dateTime';

interface Attachment {
  name: string;
  sizeKb: number;
}

export interface PostCardEditState {
  enquiryEmail: string;
  staffOwnerIds: number[];
  /** `YYYY-MM-DD` in SGT — only present when editing a consent form. */
  consentByDate?: string;
}

/**
 * Extract a `YYYY-MM-DD` string in the Asia/Singapore timezone from a UTC ISO
 * timestamp (e.g. `"2026-03-30T15:59:59.000Z"` → `"2026-03-30"`).
 * Returns `""` for missing or unparseable inputs.
 */
export function isoToSgtDate(iso: string | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Singapore' });
}

interface PostCardProps {
  post: PGPost;
  /** Optional attachments — not yet carried by `PGPost`; wired from callers as needed. */
  attachments?: Attachment[];
  className?: string;
  /** When true the enquiry email + staff-in-charge fields switch to editable selectors. */
  isEditing?: boolean;
  editState?: PostCardEditState;
  onEditStateChange?: (patch: Partial<PostCardEditState>) => void;
  /** School staff list — required when `isEditing` is true. */
  staffList?: PGApiSchoolStaff[];
  /** Preset email options for the enquiry email selector. */
  emailOptions?: string[];
}

function formatSize(sizeKb: number) {
  if (sizeKb >= 1024) {
    return `${(sizeKb / 1024).toFixed(1)} MB`;
  }
  return `${sizeKb} KB`;
}

function reminderSummary(reminder: ReminderConfig): string | null {
  if (reminder.type === 'NONE') return null;
  const when = formatDate(reminder.date);
  return reminder.type === 'ONE_TIME'
    ? `One-time reminder on ${when}`
    : `Daily reminders from ${when}`;
}

/**
 * Right-rail summary card on the post detail view. Narrows on `post.kind` to
 * render announcement- vs consent-form-specific metadata inline; the prop
 * surface stays `{ post }` so form-only fields don't leak onto the shared API.
 */
export function PostCard({
  post,
  attachments,
  className,
  isEditing = false,
  editState,
  onEditStateChange,
  staffList = [],
  emailOptions = [],
}: PostCardProps) {
  const [recipientsSheetOpen, setRecipientsSheetOpen] = useState(false);
  const [sheetTargetLabel, setSheetTargetLabel] = useState('');

  const isForm = post.kind === 'form';
  const kindLabel = 'Post';

  // `event.start` / `event.end` arrive as SGT-anchored ISO-8601 from the detail
  // mapper (see `mapConsentFormDetail`), so `formatDateTime` renders them in
  // the teacher's intended timezone without a conversion round-trip.
  const eventStart = isForm && post.event ? formatDateTime(post.event.start) : undefined;
  const eventEnd = isForm && post.event ? formatDateTime(post.event.end) : undefined;
  const venue = isForm ? post.event?.venue : undefined;
  const dueDate = isForm ? formatDate(post.consentByDate) : undefined;
  const reminder = isForm ? reminderSummary(post.reminder) : null;
  // Default reminder is always sent on the consent-by date itself (PGW behaviour).
  // Only show when a due date has been set on the form.
  const defaultReminderDate =
    isForm && post.consentByDate ? formatDate(post.consentByDate) : undefined;
  const questions = isForm ? post.questions : undefined;

  return (
    <>
      <Card className={className}>
        <CardContent className="space-y-4 p-5">
          <p className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
            {kindLabel}
          </p>

          <div className="space-y-3">
            <h3 className="text-base leading-snug font-semibold">{post.title}</h3>
            <p className="text-sm leading-relaxed whitespace-pre-line text-muted-foreground">
              {post.description}
            </p>
          </div>

          {/* ── Sent to ─────────────────────────────────────────────────────── */}
          {post.targets && post.targets.length > 0 && (
            <>
              <Separator />
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground">Sent to</p>
                <div className="flex flex-wrap gap-x-3 gap-y-1">
                  {post.targets.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      className="cursor-pointer text-left text-sm font-medium underline-offset-2 hover:underline"
                      onClick={() => {
                        setSheetTargetLabel(t.label);
                        setRecipientsSheetOpen(true);
                      }}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {isForm && (eventStart || venue || dueDate || reminder || defaultReminderDate) && (
            <>
              <Separator />
              <div className="space-y-2.5">
                {eventStart && (
                  <div className="flex items-start gap-2 text-sm">
                    <CalendarClock
                      className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
                      strokeWidth={2}
                    />
                    <span>
                      {eventStart}
                      {eventEnd ? ` \u2013 ${eventEnd}` : ''}
                    </span>
                  </div>
                )}
                {venue && (
                  <div className="flex items-start gap-2 text-sm">
                    <MapPin
                      className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
                      strokeWidth={2}
                    />
                    <span>{venue}</span>
                  </div>
                )}
                {dueDate && (
                  <div className="flex items-start gap-2 text-sm">
                    <CalendarDays
                      className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
                      strokeWidth={2}
                    />
                    <span>Respond by {dueDate}</span>
                  </div>
                )}
                {reminder && (
                  <div className="flex items-start gap-2 text-sm">
                    <Bell
                      className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
                      strokeWidth={2}
                    />
                    <span>{reminder}</span>
                  </div>
                )}
                {defaultReminderDate && (
                  <div className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Bell className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} />
                    <span>Default reminder: {defaultReminderDate}</span>
                  </div>
                )}
              </div>
            </>
          )}

          {isForm && questions && questions.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <p className="text-sm font-medium">Questions</p>
                <ul className="space-y-1.5">
                  {questions.map((q, i) => (
                    <li key={q.id} className="flex items-start gap-2 text-sm">
                      <HelpCircle
                        className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
                        strokeWidth={2}
                      />
                      <span className="flex-1">
                        {i + 1}. {q.text}
                        {q.type === 'mcq' && (
                          <span className="ml-1 text-xs text-muted-foreground">
                            (Multiple choice)
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}

          {attachments && attachments.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <p className="text-sm font-medium">Attachments</p>
                {/* File expiry notice — only relevant for drafts whose attachments haven't been published yet */}
                {post.status === 'draft' && (
                  <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    Attached files may expire after a period. Download them before they become
                    unavailable.
                  </div>
                )}
                <ul className="space-y-1.5">
                  {attachments.map((att) => (
                    <li key={att.name} className="flex items-center gap-2 text-sm">
                      <Paperclip className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="flex-1 truncate">{att.name}</span>
                      <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                        {formatSize(att.sizeKb)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}

          {/* ── Consent by date (edit mode only) ─────────────────────────────── */}
          {isForm && isEditing && (
            <>
              <Separator />
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground">Consent by date</p>
                <input
                  type="date"
                  className="h-9 w-full rounded-[14px] border border-input bg-background px-3 text-sm focus:ring-2 focus:ring-ring/50 focus:outline-none"
                  value={
                    editState?.consentByDate ??
                    isoToSgtDate((post as PGConsentFormPost).consentByDate)
                  }
                  onChange={(e) => onEditStateChange?.({ consentByDate: e.target.value })}
                />
              </div>
            </>
          )}

          {/* ── Enquiry email ─────────────────────────────────────────────────── */}
          {(post.enquiryEmail || isEditing) && (
            <>
              <Separator />
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground">Enquiry contact</p>
                {isEditing ? (
                  <EnquiryEmailSelector
                    emailOptions={emailOptions}
                    value={editState?.enquiryEmail ?? post.enquiryEmail ?? ''}
                    onChange={(email) => onEditStateChange?.({ enquiryEmail: email })}
                  />
                ) : (
                  <p className="text-sm font-medium">{post.enquiryEmail}</p>
                )}
              </div>
            </>
          )}

          {/* ── Staff in charge ───────────────────────────────────────────────── */}
          {(post.staffInCharge || isEditing) && (
            <>
              <Separator />
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground">Staff in charge</p>
                {isEditing ? (
                  <StaffSelector
                    staff={staffList}
                    value={(editState?.staffOwnerIds ?? []).map((id) => {
                      const s = staffList.find((s) => s.staffId === id);
                      return s
                        ? {
                            id: s.staffId.toString(),
                            label: s.name,
                            type: 'individual' as const,
                            count: 1,
                          }
                        : {
                            id: id.toString(),
                            label: 'Unknown staff',
                            type: 'individual' as const,
                            count: 1,
                          };
                    })}
                    onChange={(entities) =>
                      onEditStateChange?.({
                        staffOwnerIds: entities
                          .filter((e) => e.type === 'individual')
                          .map((e) => Number(e.id)),
                      })
                    }
                  />
                ) : (
                  <p className="text-sm font-medium">{post.staffInCharge}</p>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ── Recipients sheet ─────────────────────────────────────────────── */}
      <Sheet open={recipientsSheetOpen} onOpenChange={setRecipientsSheetOpen}>
        <SheetContent className="flex flex-col gap-0 overflow-hidden p-0">
          <SheetHeader className="border-b px-6 py-4">
            <SheetTitle>{sheetTargetLabel}</SheetTitle>
          </SheetHeader>
          <ul className="flex-1 divide-y overflow-y-auto px-6">
            {[...post.recipients]
              .sort((a, b) => {
                const byClass = a.classLabel.localeCompare(b.classLabel);
                return byClass !== 0 ? byClass : a.studentName.localeCompare(b.studentName);
              })
              .map((r) => (
                <li key={r.studentId} className="flex items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{r.studentName}</p>
                    {r.indexNumber && (
                      <p className="text-xs text-muted-foreground tabular-nums">{r.indexNumber}</p>
                    )}
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">{r.classLabel}</span>
                </li>
              ))}
          </ul>
        </SheetContent>
      </Sheet>
    </>
  );
}
