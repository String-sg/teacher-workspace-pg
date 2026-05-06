import { Plus } from 'lucide-react';
import React, { useCallback, useState } from 'react';
import { Link, useLoaderData, useLocation, useNavigate, useParams } from 'react-router';

import { fetchCustomGroupDetail, updateCustomGroup } from '~/api/client';
import type { PGApiCustomGroupDetail, PGApiSchoolStudent } from '~/api/types';
import { ExcelUploadPanel } from '~/components/groups/ExcelUploadPanel';
import type { ValidateResult } from '~/components/groups/validate-upload-students';
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

type ViewMode = 'list' | 'excel-upload' | 'excel-results';

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
  const [students, setStudents] = useState<DisplayStudent[]>(initialStudents);
  const [submitting, setSubmitting] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [uploadResult, setUploadResult] = useState<ValidateResult | null>(null);

  const studentCount = students.length;
  const originalIds = detail.students.map((s) => s.studentId).sort((a, b) => a - b);
  const currentIds = students.map((s) => s.studentId).sort((a, b) => a - b);
  const studentsChanged =
    originalIds.length !== currentIds.length || originalIds.some((id, i) => id !== currentIds[i]);
  const dirty = title.trim() !== detail.name || studentsChanged;
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

  const handleUploadResult = useCallback((result: ValidateResult) => {
    setUploadResult(result);
    setViewMode('excel-results');
  }, []);

  function confirmUploadResults() {
    if (!uploadResult) return;
    const mapped: DisplayStudent[] = uploadResult.validStudents.map((s) => ({
      studentId: s.pgStudentId,
      studentName: s.studentName,
      className: s.className,
    }));
    setStudents((prev) => [...prev, ...mapped]);
    setUploadResult(null);
    setViewMode('list');
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
            {viewMode === 'list' && (
              <>
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
                            to={`/groups/customGroups/${groupId}/edit/addStudents`}
                            state={{ alreadyAdded: students.map((s) => s.studentId) }}
                          />
                        }
                      >
                        Add manually
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        disabled={studentCount > 0}
                        onClick={() => setViewMode('excel-upload')}
                      >
                        Upload via Excel
                      </DropdownMenuItem>
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
              </>
            )}

            {viewMode === 'excel-upload' && (
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-medium">Upload via Excel</h2>
                  <Button variant="ghost" size="sm" onClick={() => setViewMode('list')}>
                    Cancel
                  </Button>
                </div>
                <ExcelUploadPanel isIhl={false} onResult={handleUploadResult} />
              </div>
            )}

            {viewMode === 'excel-results' && uploadResult && (
              <div>
                <h2 className="text-lg font-medium">Upload results</h2>
                <div className="mt-4 space-y-3">
                  {uploadResult.validStudents.length > 0 && (
                    <p className="text-sm text-green-700">
                      {uploadResult.validStudents.length} valid student
                      {uploadResult.validStudents.length === 1 ? '' : 's'}
                    </p>
                  )}
                  {uploadResult.invalidStudents.length > 0 && (
                    <div>
                      <p className="text-sm text-destructive">
                        {uploadResult.invalidStudents.length} invalid student
                        {uploadResult.invalidStudents.length === 1 ? '' : 's'}
                      </p>
                      <ul className="mt-2 divide-y rounded-md border border-destructive/20">
                        {uploadResult.invalidStudents.map((s, i) => (
                          <li key={i} className="px-3 py-2 text-sm">
                            <span className="font-medium">Row {s.row}:</span>{' '}
                            {s.name || s.studentId || '—'} — {s.message}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                <div className="mt-4 flex gap-3">
                  <Button onClick={confirmUploadResults}>
                    Add {uploadResult.validStudents.length} student
                    {uploadResult.validStudents.length === 1 ? '' : 's'}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setUploadResult(null);
                      setViewMode('excel-upload');
                    }}
                  >
                    Upload another file
                  </Button>
                </div>
              </div>
            )}
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
