import React, { useCallback, useState } from 'react';

import {
  checkForDuplicateEntries,
  checkForDuplicateHeaders,
  checkForDuplicateStudentIds,
  checkForMissingHeaders,
  checkForMissingValues,
  checkIsBlank,
  isOverMaxCapacity,
  mapStudentDataHeaders,
  MAX_STUDENTS,
} from './excel-upload-validation';
import { parseExcelFile } from './parse-excel-file';
import { validateUploadStudents, type ValidateResult } from './validate-upload-students';

const MAX_FILE_SIZE = 5 * 1024 * 1024;

interface ExcelUploadPanelProps {
  isIhl: boolean;
  onResult: (result: ValidateResult) => void;
}

export const ExcelUploadPanel: React.FC<ExcelUploadPanelProps> = ({ isIhl, onResult }) => {
  const [error, setError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setError(null);

      if (file.size > MAX_FILE_SIZE) {
        setError('File size exceeds the 5 MB limit. Please upload a smaller file.');
        return;
      }

      try {
        const rows = await parseExcelFile(file);

        if (checkIsBlank(rows)) {
          setError('The file is empty. Please check it and re-upload.');
          return;
        }

        if (isIhl) {
          const ihlRows = rows as { 'Student ID': string }[];
          const dupIds = checkForDuplicateStudentIds(ihlRows);
          if (dupIds) {
            setError(dupIds);
            return;
          }

          if (isOverMaxCapacity(ihlRows.length)) {
            setError(
              `You may only upload up to ${MAX_STUDENTS} Student IDs. Please amend and re-upload.`,
            );
            return;
          }

          setIsValidating(true);
          const result = await validateUploadStudents({
            type: 'ihl',
            students: ihlRows.map((r) => ({ studentId: String(r['Student ID']).trim() })),
          });
          onResult(result);
        } else {
          const dupHeaders = checkForDuplicateHeaders(rows as Record<string, string>[]);
          if (dupHeaders) {
            setError(dupHeaders);
            return;
          }

          const missingHeaders = checkForMissingHeaders(rows as Record<string, string>[]);
          if (missingHeaders) {
            setError(missingHeaders);
            return;
          }

          const mapped = mapStudentDataHeaders(rows as Record<string, string>[]) as {
            Name: string;
            Class: string;
          }[];

          const { hasMissing } = checkForMissingValues(mapped);
          if (hasMissing) {
            setError(
              "Your file has rows missing 'Name' or 'Class' entries. Please update and re-upload.",
            );
            return;
          }

          if (isOverMaxCapacity(mapped.length)) {
            setError(
              `You may only upload up to ${MAX_STUDENTS} students. Please reduce the number and re-upload.`,
            );
            return;
          }

          const dupEntries = checkForDuplicateEntries(mapped);
          if (dupEntries) {
            setError(dupEntries);
            return;
          }

          setIsValidating(true);
          const result = await validateUploadStudents({
            type: 'ms',
            students: mapped.map((r) => ({ name: r.Name, className: r.Class })),
          });
          onResult(result);
        }
      } catch {
        setError('Sorry, an unexpected error occurred on our side. Please try again later.');
      } finally {
        setIsValidating(false);
      }
    },
    [isIhl, onResult],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="text-sm text-muted-foreground">
        {isIhl ? (
          <>
            <p>
              Please create a new <b>Excel file</b>, label the first column as{' '}
              <b>&apos;Student ID&apos;</b>, and enter the unique student IDs beneath the header.
              Save and upload the file below.
            </p>
            <p className="mt-3 text-xs font-semibold">Sample file to upload:</p>
            <table className="mt-1 border border-border text-xs">
              <thead>
                <tr className="bg-muted">
                  <th className="w-8 border-r border-border px-1 py-0.5 text-center font-normal text-muted-foreground/60" />
                  <th className="px-3 py-1 text-left font-semibold">A</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-border">
                  <td className="border-r border-border px-1 py-0.5 text-center text-muted-foreground/60">
                    1
                  </td>
                  <td className="px-3 py-1 font-semibold">Student ID</td>
                </tr>
                <tr className="border-t border-border">
                  <td className="border-r border-border px-1 py-0.5 text-center text-muted-foreground/60">
                    2
                  </td>
                  <td className="px-3 py-1">S1234567A</td>
                </tr>
                <tr className="border-t border-border">
                  <td className="border-r border-border px-1 py-0.5 text-center text-muted-foreground/60">
                    3
                  </td>
                  <td className="px-3 py-1">S2345678B</td>
                </tr>
                <tr className="border-t border-border">
                  <td className="border-r border-border px-1 py-0.5 text-center text-muted-foreground/60">
                    4
                  </td>
                  <td className="px-3 py-1">S3456789C</td>
                </tr>
              </tbody>
            </table>
          </>
        ) : (
          <>
            <p>
              Upload an Excel file (.xlsx) with two columns: <b>&apos;Name&apos;</b> and{' '}
              <b>&apos;Class&apos;</b>.
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                The columns can be in <b>any order and any position</b>, as long as they are named
                correctly.
              </li>
              <li>Include student details that match the records in School Cockpit.</li>
            </ul>
            <p className="mt-3 text-xs font-semibold">Sample file to upload:</p>
            <table className="mt-1 border border-border text-xs">
              <thead>
                <tr className="bg-muted">
                  <th className="w-8 border-r border-border px-1 py-0.5 text-center font-normal text-muted-foreground/60" />
                  <th className="border-r border-border px-3 py-1 text-left font-semibold">A</th>
                  <th className="px-3 py-1 text-left font-semibold">B</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-border">
                  <td className="border-r border-border px-1 py-0.5 text-center text-muted-foreground/60">
                    1
                  </td>
                  <td className="border-r border-border px-3 py-1 font-semibold">Name</td>
                  <td className="px-3 py-1 font-semibold">Class</td>
                </tr>
                <tr className="border-t border-border">
                  <td className="border-r border-border px-1 py-0.5 text-center text-muted-foreground/60">
                    2
                  </td>
                  <td className="border-r border-border px-3 py-1">CHEN WEI JIA</td>
                  <td className="px-3 py-1">P1-DILIGENCE</td>
                </tr>
                <tr className="border-t border-border">
                  <td className="border-r border-border px-1 py-0.5 text-center text-muted-foreground/60">
                    3
                  </td>
                  <td className="border-r border-border px-3 py-1">RONALD TONG YING MING</td>
                  <td className="px-3 py-1">P1-DILIGENCE</td>
                </tr>
                <tr className="border-t border-border">
                  <td className="border-r border-border px-1 py-0.5 text-center text-muted-foreground/60">
                    4
                  </td>
                  <td className="border-r border-border px-3 py-1">RAJESH KUMAR</td>
                  <td className="px-3 py-1">P1-DILIGENCE</td>
                </tr>
              </tbody>
            </table>
          </>
        )}
      </div>

      <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/25 px-6 py-8 text-center transition-colors hover:border-muted-foreground/50">
        <span className="text-sm font-medium">
          {isValidating ? 'Validating...' : 'Click to upload .xlsx file'}
        </span>
        <span className="text-xs text-muted-foreground">Max 5 MB</span>
        <input
          type="file"
          className="sr-only"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          aria-label="Upload Excel file"
          onChange={handleFileChange}
          disabled={isValidating}
        />
      </label>

      {error && (
        <div
          role="alert"
          className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {error}
        </div>
      )}
    </div>
  );
};
