import React, { useEffect, useMemo, useState } from 'react';

import type { PGApiSchoolStaff } from '~/api/types';
import { StaffSelector } from '~/components/comms/staff-selector';
import type { SelectedStaff } from '~/components/comms/staff-selector';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui';
import { notify } from '~/lib/notify';

interface ShareGroupModalProps {
  open: boolean;
  onClose: () => void;
  staff: PGApiSchoolStaff[];
  creatorStaffId: number;
  alreadySharedStaffIds: number[];
  onShare: (staffIds: number[]) => Promise<void>;
}

export const ShareGroupModal: React.FC<ShareGroupModalProps> = ({
  open,
  onClose,
  staff,
  creatorStaffId,
  alreadySharedStaffIds,
  onShare,
}) => {
  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
    >
      {open && (
        <ShareGroupModalContent
          staff={staff}
          creatorStaffId={creatorStaffId}
          alreadySharedStaffIds={alreadySharedStaffIds}
          onShare={onShare}
          onClose={onClose}
        />
      )}
    </Dialog>
  );
};

const ShareGroupModalContent: React.FC<{
  staff: PGApiSchoolStaff[];
  creatorStaffId: number;
  alreadySharedStaffIds: number[];
  onShare: (staffIds: number[]) => Promise<void>;
  onClose: () => void;
}> = ({ staff, creatorStaffId, alreadySharedStaffIds, onShare, onClose }) => {
  const [selectorReady, setSelectorReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const alreadySharedSet = useMemo(() => new Set(alreadySharedStaffIds), [alreadySharedStaffIds]);

  const pickerStaff = useMemo(
    () => staff.filter((s) => s.staffId !== creatorStaffId),
    [staff, creatorStaffId],
  );

  const initialSelected = useMemo<SelectedStaff[]>(
    () =>
      staff
        .filter((s) => alreadySharedSet.has(s.staffId))
        .map((s) => ({
          id: s.staffId.toString(),
          label: s.name,
          type: 'individual' as const,
          count: 1,
        })),
    [staff, alreadySharedSet],
  );

  const [selected, setSelected] = useState<SelectedStaff[]>(initialSelected);

  const newStaffIds = useMemo(
    () => selected.map((s) => Number(s.id)).filter((id) => !alreadySharedSet.has(id)),
    [selected, alreadySharedSet],
  );

  useEffect(() => {
    const id = requestAnimationFrame(() => setSelectorReady(true));
    return () => cancelAnimationFrame(id);
  }, []);

  async function handleShare() {
    if (newStaffIds.length === 0) return;
    setSubmitting(true);
    try {
      await onShare(newStaffIds);
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not share the group.';
      notify.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <DialogContent className="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>Share group</DialogTitle>
        <DialogDescription>
          By sharing this group, other staff members will have access to:
        </DialogDescription>
      </DialogHeader>

      <ul className="list-disc space-y-1 pl-5 text-sm">
        <li>View and send to the group</li>
        <li>Edit the group name</li>
        <li>Add or delete students</li>
        <li>Share the group with other staff</li>
      </ul>

      <div>
        {selectorReady && (
          <StaffSelector value={selected} onChange={setSelected} staff={pickerStaff} />
        )}
      </div>

      <DialogFooter>
        <Button disabled={newStaffIds.length === 0 || submitting} onClick={handleShare}>
          {submitting ? 'Sharing…' : 'Share group'}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
};
