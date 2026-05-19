import type { PostKind } from '~/components/posts/PostTypePicker';
import type { PostFormField } from '~/lib/validation-errors';

import type { PostFormState } from './CreatePostView';

/**
 * Pure validation helper for the CreatePost form. Extracted so the rules can
 * be unit-tested without mounting the full component.
 *
 * Gate 1 — common: title, enquiry email, recipients, and description are
 * required for all post types.
 * Gate 2 — post-with-response only: due date is required; if a reminder is
 * configured, its date must fall in `[tomorrow, dueDate - 1]` (matches
 * pgw-web's reminder window).
 */
export function isCreatePostFormValid(
  state: PostFormState,
  selectedType: PostKind | null,
): boolean {
  // Gate 1: required for all post types.
  const baseValid =
    state.title.trim().length > 0 &&
    state.enquiryEmail.trim().length > 0 &&
    state.selectedRecipients.length > 0 &&
    state.description.trim().length > 0 &&
    state.description.length <= 2000;

  if (!baseValid) return false;

  // Gate 2: consent-form (post-with-response) — due date required.
  if (selectedType === 'post-with-response' && state.dueDate.trim().length === 0) {
    return false;
  }

  // Gate 3: all in-flight uploads must have resolved. Submitting while rows
  // are `uploading` / `verifying` would send partial state; errored rows are
  // allowed through because the mapper filters them out on the wire.
  const allUploadsResolved = [...state.attachments, ...state.photos].every(
    (u) => u.status === 'ready' || u.status === 'error',
  );
  if (!allUploadsResolved) return false;

  if (selectedType !== 'post-with-response') return true;

  // Due date must be today or later. Past dates make the reminder window empty
  // and are rejected by pgw-web business rules.
  const today = todayIso();
  if (state.dueDate < today) return false;

  // Reminder-date window: when ONE_TIME or DAILY, date must sit between
  // tomorrow and `dueDate - 1` (inclusive). Otherwise PGW returns a generic
  // "Bad request" at submit time.
  if (state.reminder.type === 'ONE_TIME' || state.reminder.type === 'DAILY') {
    const r = state.reminder.date;
    if (!r) return false;
    const min = addDaysIso(today, 1);
    const max = addDaysIso(state.dueDate, -1);
    if (r < min || r > max) return false;
  }

  return true;
}

/**
 * Returns field-level error messages for every required field that is
 * currently empty. Used to stamp errors on the form when Post/Schedule
 * is clicked while the form is invalid.
 */
export function computeInlineErrors(
  state: PostFormState,
  selectedType: PostKind | null,
): Partial<Record<PostFormField, string>> {
  const errors: Partial<Record<PostFormField, string>> = {};
  if (!state.title.trim()) errors.title = 'Please enter a title.';
  if (!state.description.trim() || state.description.length > 2000)
    errors.description = 'Please write the post details.';
  if (!state.enquiryEmail.trim()) errors.enquiryEmail = 'Please select an enquiry email.';
  if (state.selectedRecipients.length === 0)
    errors.recipients = 'Please select at least one recipient.';
  if (selectedType === 'post-with-response' && !state.dueDate.trim())
    errors.dueDate = 'Please set a due date for responses.';
  return errors;
}

export function hasPendingUploads(state: PostFormState): boolean {
  return [...state.attachments, ...state.photos].some(
    (u) => u.status === 'uploading' || u.status === 'verifying',
  );
}

function todayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDaysIso(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  const yy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}
