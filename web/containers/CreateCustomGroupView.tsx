import { Plus } from 'lucide-react';
import React, { useCallback, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';

import { createCustomGroup } from '~/api/client';
import type { PGApiSchoolStudent } from '~/api/types';
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

interface IncomingNavState {
  addedStudents?: PGApiSchoolStudent[];
}

type ViewMode = 'list' | 'excel-upload' | 'excel-results';

const CreateCustomGroupView: React.FC = () => {
  const [title, setTitle] = useState('');
  const location = useLocation();
  const navigate = useNavigate();
  const navState = (location.state as IncomingNavState | null) ?? {};
  const [students, setStudents] = useState<PGApiSchoolStudent[]>(navState.addedStudents ?? []);
  const [submitting, setSubmitting] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [uploadResult, setUploadResult] = useState<ValidateResult | null>(null);

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

  const handleUploadResult = useCallback((result: ValidateResult) => {
    setUploadResult(result);
    setViewMode('excel-results');
  }, []);

  function confirmUploadResults() {
    if (!uploadResult) return;
    const mapped: PGApiSchoolStudent[] = uploadResult.validStudents.map((s) => ({
      studentId: s.pgStudentId,
      studentName: s.studentName,
      uinFinNo: s.uinFinNo ?? '',
      classSerialNo: s.indexNumber ?? '',
      classCode: s.classCode,
      className: s.className,
      levelCode: s.levelCode,
      levelDescription: s.levelCodeDescription,
      cca: s.cca?.map((c) => c.ccaDescription) ?? [],
    }));
    setStudents((prev) => [...prev, ...mapped]);
    setUploadResult(null);
    setViewMode('list');
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
                            to="/groups/customGroups/new/addStudents"
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
                {studentCount === 0 ? (
                  <div className="mt-2 rounded-md bg-muted p-6 text-center text-sm text-muted-foreground">
                    No students added yet.
                  </div>
                ) : (
                  <ul className="mt-2 divide-y rounded-md border">
                    {students.map((s) => (
                      <li
                        key={s.studentId}
                        className="flex items-center justify-between p-3 text-sm"
                      >
                        <span>{s.studentName}</span>
                        <span className="text-xs text-muted-foreground">{s.className}</span>
                      </li>
                    ))}
                  </ul>
                )}
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
