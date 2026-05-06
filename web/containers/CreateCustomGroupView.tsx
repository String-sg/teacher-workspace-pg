import { Plus } from 'lucide-react';
import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';

import { createCustomGroup } from '~/api/client';
import type { PGApiSchoolStudent } from '~/api/types';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Input,
} from '~/components/ui';
import { notify } from '~/lib/notify';

const TITLE_MAX = 120;

interface IncomingNavState {
  addedStudents?: PGApiSchoolStudent[];
}

const CreateCustomGroupView: React.FC = () => {
  const [title, setTitle] = useState('');
  const location = useLocation();
  const navigate = useNavigate();
  const navState = (location.state as IncomingNavState | null) ?? {};
  const [students] = useState<PGApiSchoolStudent[]>(navState.addedStudents ?? []);
  const [submitting, setSubmitting] = useState(false);

  const studentCount = students.length;
  const canSave = title.trim().length > 0 && studentCount > 0;

  async function handleSave() {
    if (!canSave) return;
    setSubmitting(true);
    try {
      const { customGroupId } = await createCustomGroup({
        name: title.trim(),
        studentIds: students.map((s) => s.studentId),
      });
      navigate(`/groups/customGroups/${customGroupId}`);
    } catch (err) {
      setSubmitting(false);
      if (!(err instanceof Error)) throw err;
      notify.error('Could not create the group. Please try again.');
    }
  }

  return (
    <div className="flex justify-center px-6 py-6">
      <div className="w-full max-w-2xl">
        <h1 className="text-2xl font-semibold">Create new group</h1>
        <div className="mt-6">
          <label htmlFor="group-title" className="text-sm font-medium">
            Title<span className="text-destructive">*</span>
          </label>
          <Input
            id="group-title"
            value={title}
            maxLength={TITLE_MAX}
            onChange={(e) => setTitle(e.target.value.slice(0, TITLE_MAX))}
            placeholder="What would you like to call your group?"
            className="mt-1"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            {TITLE_MAX - title.length} characters left
          </p>

          <div className="mt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">
                {studentCount} student{studentCount === 1 ? '' : 's'} added.
              </p>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button variant="secondary">
                      <Plus className="size-4" aria-hidden />
                      Add Students
                    </Button>
                  }
                />
                <DropdownMenuContent>
                  <DropdownMenuItem
                    render={
                      <Link
                        to="/groups/customGroups/new/addStudents"
                        state={{ alreadyAdded: students.map((s) => s.studentId) }}
                      />
                    }
                  >
                    Add manually
                  </DropdownMenuItem>
                  <DropdownMenuItem disabled>Upload via Excel</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            {studentCount === 0 ? (
              <div className="mt-2 rounded-md bg-muted p-6 text-center text-sm text-muted-foreground">
                No students added yet.
              </div>
            ) : (
              <ul className="mt-2 divide-y rounded-md border">
                {students.map((s) => (
                  <li key={s.studentId} className="flex items-center justify-between p-3 text-sm">
                    <span>{s.studentName}</span>
                    <span className="text-xs text-muted-foreground">{s.className}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="mt-8 flex items-center justify-end gap-3">
            <Link
              to="/groups"
              className="text-sm font-medium text-muted-foreground hover:underline"
            >
              Cancel
            </Link>
            <Button
              disabled={!canSave || submitting}
              title={canSave ? undefined : 'Add at least one student to create the group'}
              onClick={handleSave}
            >
              {submitting ? 'Creating…' : 'Create Now'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export { CreateCustomGroupView as Component };
