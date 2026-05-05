import React, { useState } from 'react';

import {
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui';
import { notify } from '~/lib/notify';

interface DeleteGroupModalProps {
  open: boolean;
  onClose: () => void;
  groupName: string;
  onDelete: () => Promise<void>;
}

export const DeleteGroupModal: React.FC<DeleteGroupModalProps> = ({
  open,
  onClose,
  groupName,
  onDelete,
}) => {
  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
    >
      {open && <DeleteGroupModalContent groupName={groupName} onDelete={onDelete} />}
    </Dialog>
  );
};

const DeleteGroupModalContent: React.FC<{
  groupName: string;
  onDelete: () => Promise<void>;
}> = ({ groupName, onDelete }) => {
  const [confirmed, setConfirmed] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirmed) return;
    setDeleting(true);
    try {
      await onDelete();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not delete the group.';
      notify.error(msg);
      setDeleting(false);
    }
  }

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Delete custom group?</DialogTitle>
        <DialogDescription>
          Are you sure you want to delete &ldquo;{groupName}&rdquo;?
        </DialogDescription>
      </DialogHeader>

      <label className="flex items-start gap-3 py-2">
        <Checkbox
          checked={confirmed}
          onCheckedChange={(val) => setConfirmed(val === true)}
          className="mt-0.5"
        />
        <span className="text-sm">
          I understand that this action cannot be undone. This will permanently delete the custom
          group as I am the only staff with access to the group.
        </span>
      </label>

      <DialogFooter>
        <Button variant="destructive" disabled={!confirmed || deleting} onClick={handleDelete}>
          {deleting ? 'Deleting…' : 'Delete'}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
};
