import React, { useMemo, useState } from 'react';

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
  excludeStaffIds: number[];
  onShare: (staffIds: number[]) => Promise<void>;
}

export const ShareGroupModal: React.FC<ShareGroupModalProps> = ({
  open,
  onClose,
  staff,
  excludeStaffIds,
  onShare,
}) => {
  const [selected, setSelected] = useState<SelectedStaff[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const excludeSet = useMemo(() => new Set(excludeStaffIds), [excludeStaffIds]);
  const filteredStaff = useMemo(
    () => staff.filter((s) => !excludeSet.has(s.staffId)),
    [staff, excludeSet],
  );

  async function handleShare() {
    if (selected.length === 0) return;
    setSubmitting(true);
    try {
      const staffIds = selected.map((s) => Number(s.id));
      await onShare(staffIds);
      onClose();
    } catch {
      notify.error('Could not share the group. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
    >
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
          <StaffSelector value={selected} onChange={setSelected} staff={filteredStaff} />
        </div>

        <DialogFooter>
          <Button disabled={selected.length === 0 || submitting} onClick={handleShare}>
            {submitting ? 'Sharing…' : 'Share group'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
