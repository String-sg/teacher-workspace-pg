import { useState } from 'react';

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from '~/components/ui';

/** Confirmation string the user must type for posted/open posts. */
const CONFIRM_WORD = 'DELETE';

interface DeletePostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * `'draft'` collapses the dialog to a single-click confirm.
   * `'posted'` shows the full live-content warning and requires the user to
   * type "DELETE" before the button enables. `null` renders nothing.
   */
  mode: 'draft' | 'posted' | null;
  /** Post title surfaced in the description so teachers see what they're about to delete. */
  title: string;
  onConfirm: () => Promise<void>;
  /** Disables the primary button while the delete request is in flight. */
  pending?: boolean;
}

function DeletePostDialog({
  open,
  onOpenChange,
  mode,
  title,
  onConfirm,
  pending = false,
}: DeletePostDialogProps) {
  const [confirmInput, setConfirmInput] = useState('');

  if (!mode) return null;

  const isDraft = mode === 'draft';
  const canDelete = isDraft || confirmInput === CONFIRM_WORD;

  const description = isDraft
    ? 'This draft will be permanently removed. This cannot be undone.'
    : 'This post has been sent to parents. Deleting it will remove it from the Parents Gateway app for everyone immediately. This cannot be undone.';

  const confirmLabel = isDraft ? 'Delete draft' : 'Delete for everyone';

  function handleOpenChange(next: boolean) {
    if (!next) setConfirmInput('');
    onOpenChange(next);
  }

  async function handleConfirm() {
    if (!canDelete || pending) return;
    await onConfirm();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete post?</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-1 py-1">
          <p className="text-xs text-muted-foreground">Post</p>
          <p className="truncate text-sm font-medium">{title || 'Untitled'}</p>
        </div>

        {!isDraft && (
          <div className="space-y-1.5">
            <Label htmlFor="delete-confirm">
              Type <span className="font-mono font-semibold">{CONFIRM_WORD}</span> to confirm
            </Label>
            <Input
              id="delete-confirm"
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              placeholder={CONFIRM_WORD}
              autoComplete="off"
              spellCheck={false}
            />
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => handleOpenChange(false)} disabled={pending}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={!canDelete || pending}>
            {pending ? 'Deleting…' : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export { DeletePostDialog };
export type { DeletePostDialogProps };
