import { Loader2 } from 'lucide-react';
import { ArrowLeft } from 'lucide-react';
import React, { useState } from 'react';
import type { LoaderFunctionArgs } from 'react-router';
import {
  isRouteErrorResponse,
  Link,
  useLoaderData,
  useNavigate,
  useRevalidator,
  useRouteError,
} from 'react-router';

import {
  cancelAnnouncementSchedule,
  cancelConsentFormSchedule,
  deleteAnnouncement,
  deleteConsentForm,
  fetchSchoolStaff,
  fetchSession,
  getConfigs,
  rescheduleAnnouncementDraft,
  rescheduleConsentFormDraft,
  updateAnnouncementEnquiryEmail,
  updateAnnouncementStaffInCharge,
  updateConsentFormDueDate,
  updateConsentFormEnquiryEmail,
  updateConsentFormStaffInCharge,
} from '~/api/client';
import { PGError, PGNotFoundError } from '~/api/errors';
import type { PGApiConfig, PGApiSchoolStaff, PGApiSession } from '~/api/types';
import { ConsentFormHistoryList } from '~/components/posts/ConsentFormHistoryList';
import { DeletePostDialog } from '~/components/posts/DeletePostDialog';
import { PostCard, isoToSgtDate, type PostCardEditState } from '~/components/posts/PostCard';
import { ReadTrackingCards, type ReadCardFilter } from '~/components/posts/ReadTrackingCards';
import {
  DEFAULT_RECIPIENT_FILTER,
  type RecipientFilterValue,
} from '~/components/posts/RecipientFilterPopover';
import { RecipientReadTable } from '~/components/posts/RecipientReadTable';
import { SchedulePickerDialog } from '~/components/posts/SchedulePickerDialog';
import { Badge, Button } from '~/components/ui';
import {
  describeScheduledSendFailure,
  getPostStatusBadge,
  isAnnouncementDraftId,
  isConsentFormDraftId,
  isConsentFormId,
  postHref,
  validatePostRoute,
  type PGAnnouncementPost,
  type AnnouncementId,
  type ConsentFormId,
  type PGConsentFormPost,
  type PGPost,
} from '~/data/mock-pg-announcements';
import { POST_REGISTRY } from '~/data/posts-registry';
import { assertNever } from '~/helpers/assertNever';
import { formatDate, formatDateTime } from '~/helpers/dateTime';
import { notify } from '~/lib/notify';

interface PostDetailLoaderData {
  post: PGPost;
  configs: PGApiConfig;
  staff: PGApiSchoolStaff[];
  session: PGApiSession;
}

// ─── Route loader ───────────────────────────────────────────────────────────

/**
 * Pick the right loader for a detail request. The list-row link carries
 * `?kind=` so we can route without touching the ID shape; if the query string
 * is missing or unrecognised we fall back to parsing the raw ID (numeric →
 * announcement, `cf_<digits>` → consent form). Anything else is a 404.
 */
export async function loader({
  params,
  request,
}: LoaderFunctionArgs): Promise<PostDetailLoaderData> {
  const id = params.id;
  if (!id) throw new Response('Not Found', { status: 404 });

  const url = new URL(request.url);
  const parsed = validatePostRoute(id, url.searchParams.get('kind'));
  if (!parsed) throw new Response('Not Found', { status: 404 });

  // Drafts are only accessible via the edit route; a direct detail
  // request for any draft ID is treated as 404.
  if (isAnnouncementDraftId(parsed)) throw new Response('Not Found', { status: 404 });
  if (isConsentFormDraftId(parsed)) throw new Response('Not Found', { status: 404 });

  const [post, configs, staff, session] = await Promise.all([
    isConsentFormId(parsed)
      ? POST_REGISTRY.form.loadDetail(parsed)
      : POST_REGISTRY.announcement.loadDetail(parsed as AnnouncementId),
    getConfigs(),
    fetchSchoolStaff().catch(() => [] as PGApiSchoolStaff[]),
    fetchSession(),
  ]);
  return { post, configs, staff, session };
}

// ─── Error boundary ─────────────────────────────────────────────────────────

export function ErrorBoundary() {
  const error = useRouteError();
  const navigate = useNavigate();
  // 404s arrive in two shapes: (a) a loader-thrown `Response(404)` for malformed
  // IDs that fail `validatePostRoute`, which hits `isRouteErrorResponse`; and
  // (b) a server 404 that bubbles up as `PGNotFoundError` from the fetch layer
  // when the ID is well-formed but the resource is missing. Both mean the same
  // thing to the user, so render the same copy.
  const isNotFound =
    (isRouteErrorResponse(error) && error.status === 404) || error instanceof PGNotFoundError;

  return (
    <div className="flex flex-col items-center justify-center gap-4 px-6 py-16">
      <h2 className="text-xl font-semibold tracking-tight">
        {isNotFound ? 'Post not found' : 'Could not load post'}
      </h2>
      <p className="text-sm text-muted-foreground">
        {isNotFound
          ? 'This post may have been deleted.'
          : 'The server may be unavailable. Please try again.'}
      </p>
      <Button variant="secondary" size="sm" onClick={() => navigate(-1)}>
        Back to Posts
      </Button>
    </div>
  );
}

// ─── Subviews ──────────────────────────────────────────────────────────────

/**
 * Strip any branded prefix from a post id and return the bare numeric id
 * PGW's draft endpoints expect (U3). Returns `null` when the id doesn't
 * parse \u2014 the Reschedule action surfaces a toast rather than issuing a
 * malformed request.
 */
function extractDraftNumericId(id: string): number | null {
  const bare = id.startsWith('annDraft_')
    ? id.slice('annDraft_'.length)
    : id.startsWith('cfDraft_')
      ? id.slice('cfDraft_'.length)
      : id.startsWith('cf_')
        ? id.slice('cf_'.length)
        : id;
  const n = Number(bare);
  return Number.isFinite(n) && n > 0 ? n : null;
}

interface DetailHeaderProps {
  post: PGPost;
  isEditing: boolean;
  saving: boolean;
  onSave: () => void;
  onCancel: () => void;
  onDelete: () => void;
}

function DetailHeader({ post, isEditing, saving, onSave, onCancel, onDelete }: DetailHeaderProps) {
  const badge = getPostStatusBadge(post);
  const iso = post.postedAt ?? post.createdAt;
  const postedDate = formatDateTime(iso) ?? formatDate(iso);
  const editHref = postHref(post, { edit: true });
  const navigate = useNavigate();
  const revalidator = useRevalidator();
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const canReschedule = post.status === 'scheduled';

  async function handleRescheduleConfirm(scheduledSendAt: string) {
    const draftId = extractDraftNumericId(post.id);
    if (draftId === null) {
      notify.error('Could not resolve the scheduled post id.');
      return;
    }
    setRescheduling(true);
    try {
      if (post.kind === 'form') {
        await rescheduleConsentFormDraft(draftId, { scheduledSendAt });
      } else {
        await rescheduleAnnouncementDraft(draftId, { scheduledSendAt });
      }
      notify.success('Post rescheduled.');
      setRescheduleOpen(false);
      revalidator.revalidate();
    } catch (err) {
      if (!(err instanceof PGError)) {
        notify.error('Failed to reschedule. Please try again.');
      }
    } finally {
      setRescheduling(false);
    }
  }

  async function handleCancelSchedule() {
    const draftId = extractDraftNumericId(post.id);
    if (draftId === null) {
      notify.error('Could not resolve the scheduled post id.');
      return;
    }
    const confirmed = window.confirm(
      'Cancel the scheduled send? The post will return to Draft so you can edit or reschedule it.',
    );
    if (!confirmed) return;
    setCancelling(true);
    try {
      if (post.kind === 'form') {
        await cancelConsentFormSchedule(draftId);
      } else {
        await cancelAnnouncementSchedule(draftId);
      }
      notify.success('Scheduled send cancelled.');
      revalidator.revalidate();
    } catch (err) {
      if (!(err instanceof PGError)) {
        notify.error('Failed to cancel the scheduled send.');
      }
    } finally {
      setCancelling(false);
    }
  }

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-start gap-3">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Back to Posts"
          className="mt-1"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>

        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{post.title}</h1>
            <Badge variant={badge.variant}>{badge.label}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Posted {postedDate}
            {post.createdBy ? ` \u00b7 ${post.createdBy}` : ''}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {canReschedule && !isEditing && (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancelSchedule}
              disabled={cancelling || rescheduling}
            >
              Cancel schedule
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setRescheduleOpen(true)}
              disabled={cancelling || rescheduling}
            >
              Reschedule
            </Button>
          </>
        )}

        {isEditing ? (
          <>
            <Button variant="ghost" size="sm" onClick={onCancel} disabled={saving}>
              Cancel
            </Button>
            <Button variant="secondary" size="sm" onClick={onSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Saving\u2026
                </>
              ) : (
                'Save changes'
              )}
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={onDelete}
            >
              Delete
            </Button>
            <Button
              variant="secondary"
              size="sm"
              render={<Link to={editHref} />}
              nativeButton={false}
            >
              Edit
            </Button>
          </>
        )}
      </div>

      {canReschedule && (
        <SchedulePickerDialog
          open={rescheduleOpen}
          onOpenChange={setRescheduleOpen}
          onConfirm={handleRescheduleConfirm}
          busy={rescheduling}
        />
      )}
    </div>
  );
}

interface DetailCardProps {
  isEditing: boolean;
  editState: PostCardEditState;
  onEditStateChange: (patch: Partial<PostCardEditState>) => void;
  staffList: PGApiSchoolStaff[];
  emailOptions: string[];
}

function AnnouncementDetail({
  post,
  isEditing,
  editState,
  onEditStateChange,
  staffList,
  emailOptions,
}: { post: PGAnnouncementPost } & DetailCardProps) {
  // Filter is lifted here so stat cards can drive it. `status` maps 1:1 to the
  // Read card's main/pending toggle; class + columns are still teacher-driven
  // via the popover.
  const [filter, setFilter] = useState<RecipientFilterValue>(DEFAULT_RECIPIENT_FILTER);
  const readCardFilter: ReadCardFilter =
    filter.status === 'read' ? 'read' : filter.status === 'unread' ? 'unread' : null;

  const attachments = (post.attachments ?? []).map((a) => ({
    name: a.name,
    sizeKb: a.size / 1024,
  }));

  const showTable = post.status === 'posted' && post.stats.totalCount > 0;

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        {post.responseType !== 'view-only' && (
          <ReadTrackingCards
            responseType={post.responseType}
            stats={post.stats}
            readFilter={readCardFilter}
            onReadFilterChange={(next) =>
              setFilter((f) => ({ ...f, status: next === null ? 'all' : next }))
            }
          />
        )}

        {showTable && (
          <div className="space-y-4 rounded-lg border bg-background p-6">
            <p className="text-sm font-semibold">Status</p>
            <RecipientReadTable
              recipients={post.recipients}
              responseType={post.responseType}
              filter={filter}
              onFilterChange={setFilter}
              exportId={String(post.id)}
            />
          </div>
        )}
      </div>

      <div className="lg:sticky lg:top-6 lg:self-start">
        <PostCard
          post={post}
          attachments={attachments}
          isEditing={isEditing}
          editState={editState}
          onEditStateChange={onEditStateChange}
          staffList={staffList}
          emailOptions={emailOptions}
        />
      </div>
    </div>
  );
}

function ConsentFormDetail({
  post,
  isEditing,
  editState,
  onEditStateChange,
  staffList,
  emailOptions,
}: { post: PGConsentFormPost } & DetailCardProps) {
  const attachments = (post.attachments ?? []).map((a) => ({
    name: a.name,
    sizeKb: a.size / 1024,
  }));

  const showTable =
    (post.status === 'open' || post.status === 'closed') && post.stats.totalCount > 0;

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <ReadTrackingCards kind="form" responseType={post.responseType} stats={post.stats} />

        {showTable && (
          <div className="space-y-4 rounded-lg border bg-background p-6">
            <p className="text-sm font-semibold">Status</p>
            <RecipientReadTable
              kind="form"
              recipients={post.recipients}
              responseType={post.responseType}
              exportId={String(post.id)}
            />
          </div>
        )}

        <ConsentFormHistoryList entries={post.history} />
      </div>

      <div className="lg:sticky lg:top-6 lg:self-start">
        <PostCard
          post={post}
          attachments={attachments}
          isEditing={isEditing}
          editState={editState}
          onEditStateChange={onEditStateChange}
          staffList={staffList}
          emailOptions={emailOptions}
        />
      </div>
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * True for statuses where the teacher can update metadata (enquiry email,
 * staff in charge) inline on the detail page via the dedicated PGW endpoints.
 * Draft / scheduled posts should be fully edited via the edit form.
 */
/**
 * Delete confirmation mode — `'posted'` requires typing "DELETE";
 * `'draft'` is a single-click confirm.
 */
function deleteMode(post: PGPost): 'posted' | 'draft' {
  if (post.kind === 'announcement') {
    return post.status === 'posted' || post.status === 'posting' ? 'posted' : 'draft';
  }
  return post.status === 'open' || post.status === 'closed' || post.status === 'posting'
    ? 'posted'
    : 'draft';
}

// ─── Component ──────────────────────────────────────────────────────────────

const PostDetailView: React.FC = () => {
  const { post, staff, session } = useLoaderData<PostDetailLoaderData>();
  const navigate = useNavigate();
  const revalidator = useRevalidator();
  const failureReason = describeScheduledSendFailure(post.scheduledSendFailureCode);

  // ── Inline edit state ──────────────────────────────────────────────────────
  const [isEditing, setIsEditing] = useState(false);
  const [editState, setEditState] = useState<PostCardEditState>(() => ({
    enquiryEmail: post.enquiryEmail ?? '',
    staffOwnerIds: post.staffOwnerIds ?? [],
  }));
  const [saving, setSaving] = useState(false);

  function handleCancel() {
    setIsEditing(false);
  }

  async function handleSave() {
    setSaving(true);
    try {
      if (post.kind === 'announcement') {
        const id = post.id as AnnouncementId;
        await Promise.all([
          updateAnnouncementEnquiryEmail(id, { enquiryEmailAddress: editState.enquiryEmail }),
          updateAnnouncementStaffInCharge(id, editState.staffOwnerIds),
        ]);
      } else {
        const id = post.id as ConsentFormId;
        const numericId = Number(id.slice('cf_'.length));
        const initialDate = isoToSgtDate(post.consentByDate);
        const calls: Promise<unknown>[] = [
          updateConsentFormEnquiryEmail(id, { enquiryEmailAddress: editState.enquiryEmail }),
          updateConsentFormStaffInCharge(id, editState.staffOwnerIds),
        ];
        // Only update due date when it has been changed from the loaded value.
        if (editState.consentByDate && editState.consentByDate !== initialDate) {
          calls.push(
            updateConsentFormDueDate(numericId, {
              consentByDate: `${editState.consentByDate}T23:59:59+08:00`,
            }),
          );
        }
        await Promise.all(calls);
      }
      notify.success('Changes saved.');
      setIsEditing(false);
      revalidator.revalidate();
    } catch {
      notify.error('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  // ── Delete state ───────────────────────────────────────────────────────────
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDeleteConfirm() {
    setDeleting(true);
    try {
      if (post.kind === 'announcement') {
        await deleteAnnouncement(post.id as AnnouncementId);
      } else {
        await deleteConsentForm(post.id as ConsentFormId);
      }
      notify.success('Post deleted.');
      void navigate('/posts');
    } catch {
      notify.error('Failed to delete. Please try again.');
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
    }
  }

  // ── Email options from session ─────────────────────────────────────────────
  const emailOptions = [session.staffEmailAdd, session.schoolEmailAddress].filter(
    (e): e is string => Boolean(e),
  );

  // ── Edit state change handler ──────────────────────────────────────────────
  function handleEditStateChange(patch: Partial<PostCardEditState>) {
    setEditState((prev) => ({ ...prev, ...patch }));
  }

  const cardProps = {
    isEditing,
    editState,
    onEditStateChange: handleEditStateChange,
    staffList: staff,
    emailOptions,
  };

  return (
    <div className="space-y-6 px-6 py-6">
      <DetailHeader
        post={post}
        isEditing={isEditing}
        saving={saving}
        onSave={handleSave}
        onCancel={handleCancel}
        onDelete={() => setDeleteOpen(true)}
      />

      {failureReason && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive"
        >
          <span className="font-medium">This post wasn&rsquo;t sent.</span> {failureReason} Pick a
          new time to try again, or cancel to return it to drafts.
        </div>
      )}

      {renderDetail(post, cardProps)}

      <DeletePostDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        mode={deleteMode(post)}
        title={post.title}
        onConfirm={handleDeleteConfirm}
        pending={deleting}
      />
    </div>
  );
};

function renderDetail(post: PGPost, cardProps: DetailCardProps) {
  switch (post.kind) {
    case 'announcement':
      return <AnnouncementDetail post={post} {...cardProps} />;
    case 'form':
      return <ConsentFormDetail post={post} {...cardProps} />;
    default:
      return assertNever(post);
  }
}

export { PostDetailView as Component };
