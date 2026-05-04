import { Plus } from 'lucide-react';
import React, { useState } from 'react';
import { Link, useLoaderData, useLocation, useNavigate, useParams } from 'react-router';

import { fetchCustomGroupDetail, updateCustomGroup } from '~/api/client';
import type { PGApiCustomGroupDetail, PGApiSchoolStudent } from '~/api/types';
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

export async function loader({
  params,
}: {
  params: { id?: string };
}): Promise<PGApiCustomGroupDetail> {
  const id = Number(params.id);
  if (!Number.isFinite(id)) throw new Response('Invalid group id', { status: 400 });
  return fetchCustomGroupDetail(id);
}

interface IncomingNavState {
  addedStudents?: PGApiSchoolStudent[];
}

interface DisplayStudent {
  studentId: number;
  studentName: string;
  className: string;
}

const EditCustomGroupView: React.FC = () => {
  const detail = useLoaderData() as PGApiCustomGroupDetail;
  const params = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const groupId = Number(params.id);

  const navState = (location.state as IncomingNavState | null) ?? {};
  const initialStudents: DisplayStudent[] = navState.addedStudents
    ? navState.addedStudents.map((s) => ({
        studentId: s.studentId,
        studentName: s.studentName,
        className: s.className,
      }))
    : detail.students.map((s) => ({
        studentId: s.studentId,
        studentName: s.studentName,
        className: s.className,
      }));

  const [title, setTitle] = useState(detail.name);
  const [students] = useState<DisplayStudent[]>(initialStudents);
  const [submitting, setSubmitting] = useState(false);

  const studentCount = students.length;
  const dirty = title.trim() !== detail.name || navState.addedStudents !== undefined;
  const canSave = title.trim().length > 0 && studentCount > 0 && dirty;

  async function handleSave() {
    if (!canSave) return;
    setSubmitting(true);
    try {
      await updateCustomGroup(groupId, {
        name: title.trim(),
        studentIds: students.map((s) => s.studentId),
      });
      navigate(`/groups/customGroups/${groupId}`);
    } catch (err) {
      setSubmitting(false);
      if (!(err instanceof Error)) throw err;
      notify.error('Could not save the group. Please try again.');
    }
  }

  return (
    <div className="flex justify-center px-6 py-6">
      <div className="w-full max-w-2xl">
        <h1 className="text-2xl font-semibold">Edit group</h1>
        <div className="mt-6">
          <label htmlFor="group-title" className="text-sm font-medium">
            Title<span className="text-destructive">*</span>
          </label>
          <Input
            id="group-title"
            value={title}
            maxLength={TITLE_MAX}
            onChange={(e) => setTitle(e.target.value.slice(0, TITLE_MAX))}
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
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    <Plus className="size-4" aria-hidden />
                    Add Students
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem asChild>
                    <Link
                      to={`/groups/customGroups/${groupId}/edit/addStudents`}
                      state={{ alreadyAdded: students.map((s) => s.studentId) }}
                    >
                      Add manually
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem disabled>Upload via Excel</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <ul className="mt-2 divide-y rounded-md border">
              {students.map((s) => (
                <li key={s.studentId} className="flex items-center justify-between p-3 text-sm">
                  <span>{s.studentName}</span>
                  <span className="text-xs text-muted-foreground">{s.className}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-8 flex items-center justify-end gap-3">
            <Link
              to={`/groups/customGroups/${groupId}`}
              className="text-sm font-medium text-muted-foreground hover:underline"
            >
              Cancel
            </Link>
            <Button disabled={!canSave || submitting} onClick={handleSave}>
              {submitting ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export { EditCustomGroupView as Component };
