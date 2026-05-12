import { Download, Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';

import {
  Badge,
  Button,
  Input,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui';
import type {
  PGConsentFormRecipient,
  PGRecipient,
  ResponseType,
} from '~/data/mock-pg-announcements';
import { formatDate } from '~/helpers/dateTime';
import { downloadCsv, toCsv, type CsvColumn } from '~/helpers/exportCsv';

import {
  countActiveFilters,
  DEFAULT_RECIPIENT_FILTER,
  RecipientColumnPopover,
  RecipientFilterPopover,
  type ColumnVisibility,
  type PgStatusFilter,
  type RecipientFilterValue,
  type StatusFilter,
} from './RecipientFilterPopover';

type FilterControlProps =
  | { filter: RecipientFilterValue; onFilterChange: (next: RecipientFilterValue) => void }
  | { filter?: undefined; onFilterChange?: undefined };

/**
 * `filter` / `onFilterChange` are optional — when both are passed the table
 * is controlled (so a parent like `PostDetailView` can wire stat cards to
 * the status filter). When absent, the table manages its own filter state.
 */
type RecipientReadTableProps = FilterControlProps &
  (
    | {
        kind?: 'announcement';
        recipients: PGRecipient[];
        responseType: ResponseType;
        /** Used in the default CSV filename so teachers can tell exports apart. */
        exportId?: string;
      }
    | {
        kind: 'form';
        recipients: PGConsentFormRecipient[];
        responseType: 'acknowledge' | 'yes-no';
        exportId?: string;
      }
  );

// ─── Toolbar ──────────────────────────────────────────────────────────────────

function Toolbar({
  filter,
  onFilterChange,
  classOptions,
  responseType,
  showPgStatus,
  timestampLabel,
  showParentGuardian,
  onExport,
}: {
  filter: RecipientFilterValue;
  onFilterChange: (next: RecipientFilterValue) => void;
  classOptions: string[];
  responseType: ResponseType | 'acknowledge' | 'yes-no';
  showPgStatus: boolean;
  timestampLabel: string;
  showParentGuardian: boolean;
  onExport: () => void;
}) {
  const active = countActiveFilters(filter);

  // Labels for active filter chips
  const chips: { key: 'classId' | 'status' | 'pg'; label: string }[] = [];
  if (filter.classId !== 'all') chips.push({ key: 'classId', label: `Class: ${filter.classId}` });
  if (filter.status !== 'all') {
    const statusLabels: Record<StatusFilter, string> = {
      all: 'All',
      read: 'Read',
      unread: 'Unread',
      acknowledged: 'Acknowledged',
      pending: 'Pending',
      yes: 'Yes',
      no: 'No',
      'no-response': 'No Response',
    };
    chips.push({ key: 'status', label: `Status: ${statusLabels[filter.status]}` });
  }
  if (filter.pg !== 'all') {
    const pgLabels: Record<PgStatusFilter, string> = {
      all: 'All',
      onboarded: 'Onboarded',
      'not-onboarded': 'Not Onboarded',
    };
    chips.push({ key: 'pg', label: `PG: ${pgLabels[filter.pg]}` });
  }

  function clearChip(key: 'classId' | 'status' | 'pg') {
    const defaults: Pick<RecipientFilterValue, 'classId' | 'status' | 'pg'> = {
      classId: 'all',
      status: 'all',
      pg: 'all',
    };
    onFilterChange({ ...filter, [key]: defaults[key] });
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-9 pl-9 text-sm"
            placeholder="Search students…"
            value={filter.search}
            onChange={(e) => onFilterChange({ ...filter, search: e.target.value })}
          />
        </div>

        {/* Filter popover */}
        <RecipientFilterPopover
          value={filter}
          onChange={onFilterChange}
          classOptions={classOptions}
          responseType={responseType}
          showPgStatus={showPgStatus}
        />

        {/* Columns popover */}
        <RecipientColumnPopover
          value={filter.columns}
          onChange={(columns) => onFilterChange({ ...filter, columns })}
          timestampLabel={timestampLabel}
          showParentGuardian={showParentGuardian}
        />

        {/* Export */}
        <Button variant="ghost" size="sm" onClick={onExport} aria-label="Export CSV">
          <Download className="h-4 w-4" />
          Export
        </Button>
      </div>

      {/* Active filter chips */}
      {active > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {chips.map((chip) => (
            <span
              key={chip.key}
              className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700"
            >
              {chip.label}
              <button
                className="ml-0.5 cursor-pointer rounded-full hover:bg-blue-100"
                onClick={() => clearChip(chip.key)}
                aria-label={`Remove ${chip.label} filter`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Status cell renderer ─────────────────────────────────────────────────────

function StatusCell({
  responseType,
  recipient,
}: {
  responseType: ResponseType | 'acknowledge' | 'yes-no';
  recipient: PGRecipient | PGConsentFormRecipient;
}) {
  if (responseType === 'view-only') {
    const r = recipient as PGRecipient;
    return r.readStatus === 'read' ? (
      <Badge variant="success">Read</Badge>
    ) : (
      <span className="text-sm text-muted-foreground">Unread</span>
    );
  }

  if (responseType === 'acknowledge') {
    // Announcement acknowledge: use acknowledgedAt; consent form: use response
    const isForm = 'response' in recipient;
    if (isForm) {
      const r = recipient as PGConsentFormRecipient;
      return r.response === 'YES' ? (
        <Badge variant="success">Acknowledged</Badge>
      ) : (
        <span className="text-sm text-muted-foreground">Pending</span>
      );
    } else {
      const r = recipient as PGRecipient;
      return r.acknowledgedAt ? (
        <Badge variant="success">Acknowledged</Badge>
      ) : (
        <span className="text-sm text-muted-foreground">Pending</span>
      );
    }
  }

  // yes-no
  const isForm = 'response' in recipient;
  if (isForm) {
    const r = recipient as PGConsentFormRecipient;
    return r.response === 'YES' ? (
      <Badge variant="success">Yes</Badge>
    ) : r.response === 'NO' ? (
      <Badge variant="destructive">No</Badge>
    ) : (
      <span className="text-sm text-muted-foreground">No Response</span>
    );
  } else {
    const r = recipient as PGRecipient;
    return r.formResponse === 'yes' ? (
      <Badge variant="success">Yes</Badge>
    ) : r.formResponse === 'no' ? (
      <Badge variant="destructive">No</Badge>
    ) : (
      <span className="text-sm text-muted-foreground">No Response</span>
    );
  }
}

// ─── Derived "status" for filtering ──────────────────────────────────────────

function deriveStatus(
  responseType: ResponseType | 'acknowledge' | 'yes-no',
  recipient: PGRecipient | PGConsentFormRecipient,
): StatusFilter {
  if (responseType === 'view-only') {
    return (recipient as PGRecipient).readStatus === 'read' ? 'read' : 'unread';
  }
  if (responseType === 'acknowledge') {
    const isForm = 'response' in recipient;
    if (isForm) {
      const r = recipient as PGConsentFormRecipient;
      return r.response === 'YES' ? 'acknowledged' : 'pending';
    } else {
      const r = recipient as PGRecipient;
      return r.acknowledgedAt ? 'acknowledged' : 'pending';
    }
  }
  // yes-no
  const isForm = 'response' in recipient;
  if (isForm) {
    const r = recipient as PGConsentFormRecipient;
    return r.response === 'YES' ? 'yes' : r.response === 'NO' ? 'no' : 'no-response';
  } else {
    const r = recipient as PGRecipient;
    return r.formResponse === 'yes' ? 'yes' : r.formResponse === 'no' ? 'no' : 'no-response';
  }
}

// ─── Sort helpers ─────────────────────────────────────────────────────────────

/** Pending/unread rows first, then alphabetical by studentName. */
function sortRecipients(
  rows: (PGRecipient | PGConsentFormRecipient)[],
  responseType: ResponseType | 'acknowledge' | 'yes-no',
): (PGRecipient | PGConsentFormRecipient)[] {
  return [...rows].sort((a, b) => {
    const aStatus = deriveStatus(responseType, a);
    const bStatus = deriveStatus(responseType, b);
    const aPending = aStatus === 'unread' || aStatus === 'pending' || aStatus === 'no-response';
    const bPending = bStatus === 'unread' || bStatus === 'pending' || bStatus === 'no-response';
    if (aPending !== bPending) return aPending ? -1 : 1;
    return a.studentName.localeCompare(b.studentName);
  });
}

// ─── Timestamp resolver ───────────────────────────────────────────────────────

function resolveTimestamp(
  responseType: ResponseType | 'acknowledge' | 'yes-no',
  recipient: PGRecipient | PGConsentFormRecipient,
): string | null | undefined {
  if (responseType === 'view-only') {
    const r = recipient as PGRecipient;
    return r.readStatus === 'read' ? r.respondedAt : undefined;
  }
  if (responseType === 'acknowledge') {
    const isForm = 'response' in recipient;
    if (isForm) {
      return (recipient as PGConsentFormRecipient).respondedAt;
    } else {
      return (recipient as PGRecipient).acknowledgedAt;
    }
  }
  // yes-no
  const isForm = 'response' in recipient;
  return isForm
    ? (recipient as PGConsentFormRecipient).respondedAt
    : (recipient as PGRecipient).respondedAt;
}

// ─── Timestamp column label ───────────────────────────────────────────────────

function timestampLabel(responseType: ResponseType | 'acknowledge' | 'yes-no'): string {
  if (responseType === 'view-only') return 'Read At';
  if (responseType === 'acknowledge') return 'Acknowledged At';
  return 'Responded At';
}

// ─── Unified table ────────────────────────────────────────────────────────────

function UnifiedTable({
  recipients,
  responseType,
  columns,
  isForm,
}: {
  recipients: (PGRecipient | PGConsentFormRecipient)[];
  responseType: ResponseType | 'acknowledge' | 'yes-no';
  columns: ColumnVisibility;
  isForm: boolean;
}) {
  const tsLabel = timestampLabel(responseType);

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Student</TableHead>
          {columns.indexNumber && <TableHead>Index No.</TableHead>}
          <TableHead>Class</TableHead>
          <TableHead>Status</TableHead>
          {columns.timestamp && <TableHead>{tsLabel}</TableHead>}
          {columns.parentGuardian && <TableHead>Parent / Guardian</TableHead>}
          {columns.pgStatus && isForm && <TableHead>PG Status</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {recipients.map((recipient) => {
          const ts = resolveTimestamp(responseType, recipient);
          const indexNo =
            'indexNumber' in recipient
              ? (recipient as PGConsentFormRecipient).indexNumber
              : undefined;
          const replyByParent = (recipient as PGRecipient | PGConsentFormRecipient).replyByParent;
          const parentType =
            'parentType' in recipient
              ? (recipient as PGConsentFormRecipient).parentType
              : undefined;
          const contactNumber =
            'contactNumber' in recipient
              ? (recipient as PGConsentFormRecipient).contactNumber
              : undefined;
          const pgStatus =
            'pgStatus' in recipient ? (recipient as PGConsentFormRecipient).pgStatus : undefined;

          return (
            <TableRow key={recipient.studentId}>
              <TableCell className="font-medium">{recipient.studentName}</TableCell>
              {columns.indexNumber && (
                <TableCell className="text-muted-foreground tabular-nums">
                  {indexNo ?? '—'}
                </TableCell>
              )}
              <TableCell>
                <Badge variant="outline">{recipient.classLabel}</Badge>
              </TableCell>
              <TableCell>
                <StatusCell responseType={responseType} recipient={recipient} />
              </TableCell>
              {columns.timestamp && (
                <TableCell className="text-muted-foreground tabular-nums">
                  {ts ? (formatDate(ts) ?? '—') : '—'}
                </TableCell>
              )}
              {columns.parentGuardian && (
                <TableCell className="text-muted-foreground">
                  {replyByParent ? (
                    <div className="flex flex-col gap-0.5">
                      <span>{replyByParent}</span>
                      {(parentType || contactNumber) && (
                        <span className="text-xs text-muted-foreground/70">
                          {[parentType, contactNumber].filter(Boolean).join(' · ')}
                        </span>
                      )}
                    </div>
                  ) : (
                    '—'
                  )}
                </TableCell>
              )}
              {columns.pgStatus && isForm && (
                <TableCell>
                  {pgStatus === 'onboarded' ? (
                    <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-blue-700/10 ring-inset">
                      Onboarded
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 ring-1 ring-slate-500/10 ring-inset">
                      Not Onboarded
                    </span>
                  )}
                </TableCell>
              )}
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

// ─── CSV export ───────────────────────────────────────────────────────────────

function rowToCsv(
  recipient: PGRecipient | PGConsentFormRecipient,
  responseType: ResponseType | 'acknowledge' | 'yes-no',
  isForm: boolean,
): Record<string, string> {
  const status = deriveStatus(responseType, recipient);
  const statusLabels: Record<StatusFilter, string> = {
    all: '',
    read: 'Read',
    unread: 'Unread',
    acknowledged: 'Acknowledged',
    pending: 'Pending',
    yes: 'Yes',
    no: 'No',
    'no-response': 'No Response',
  };
  const ts = resolveTimestamp(responseType, recipient);
  const indexNo =
    'indexNumber' in recipient ? ((recipient as PGConsentFormRecipient).indexNumber ?? '') : '';
  const replyByParent = (recipient as PGRecipient | PGConsentFormRecipient).replyByParent ?? '';
  const parentType =
    'parentType' in recipient ? ((recipient as PGConsentFormRecipient).parentType ?? '') : '';
  const contactNumber =
    'contactNumber' in recipient ? ((recipient as PGConsentFormRecipient).contactNumber ?? '') : '';
  const pgStatus = isForm
    ? (recipient as PGConsentFormRecipient).pgStatus === 'onboarded'
      ? 'Onboarded'
      : 'Not Onboarded'
    : '';
  return {
    studentName: recipient.studentName,
    indexNumber: indexNo,
    classLabel: recipient.classLabel,
    status: statusLabels[status],
    timestamp: ts ? (formatDate(ts) ?? '') : '',
    parentGuardian: replyByParent,
    parentType,
    contactNumber,
    pgStatus,
  };
}

function buildCsvColumns(
  columns: ColumnVisibility,
  isForm: boolean,
  tsLabel: string,
): CsvColumn<Record<string, string>>[] {
  const out: CsvColumn<Record<string, string>>[] = [{ key: 'studentName', header: 'Student' }];
  if (columns.indexNumber) out.push({ key: 'indexNumber', header: 'Index No.' });
  out.push({ key: 'classLabel', header: 'Class' });
  out.push({ key: 'status', header: 'Status' });
  if (columns.timestamp) out.push({ key: 'timestamp', header: tsLabel });
  if (columns.parentGuardian) {
    out.push({ key: 'parentGuardian', header: 'Parent / Guardian' });
    if (isForm) {
      out.push({ key: 'parentType', header: 'Relationship' });
      out.push({ key: 'contactNumber', header: 'Contact No.' });
    }
  }
  if (columns.pgStatus && isForm) out.push({ key: 'pgStatus', header: 'PG Status' });
  return out;
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function RecipientReadTable(props: RecipientReadTableProps) {
  const isForm = props.kind === 'form';
  const controlled = props.filter !== undefined;

  const [uncontrolledFilter, setUncontrolledFilter] =
    useState<RecipientFilterValue>(DEFAULT_RECIPIENT_FILTER);
  const filter = controlled ? props.filter! : uncontrolledFilter;
  const onFilterChange = controlled ? props.onFilterChange! : setUncontrolledFilter;

  const classOptions = useMemo(
    () => Array.from(new Set(props.recipients.map((r) => r.classLabel))).sort(),
    [props.recipients],
  );

  const responseType = props.responseType as ResponseType | 'acknowledge' | 'yes-no';

  const filteredRecipients = useMemo(() => {
    const rows = props.recipients as (PGRecipient | PGConsentFormRecipient)[];
    const filtered = rows.filter((r) => {
      // Search filter
      if (filter.search) {
        const q = filter.search.toLowerCase();
        const nameMatch = r.studentName.toLowerCase().includes(q);
        const classMatch = r.classLabel.toLowerCase().includes(q);
        if (!nameMatch && !classMatch) return false;
      }
      // Class filter
      if (filter.classId !== 'all' && r.classLabel !== filter.classId) return false;
      // Status filter
      if (filter.status !== 'all' && deriveStatus(responseType, r) !== filter.status) return false;
      // PG status filter
      if (filter.pg !== 'all') {
        const pgS = 'pgStatus' in r ? (r as PGConsentFormRecipient).pgStatus : undefined;
        if (pgS !== filter.pg) return false;
      }
      return true;
    });
    return sortRecipients(filtered, responseType);
  }, [props.recipients, filter, responseType]);

  const tsLabel = timestampLabel(responseType);

  const handleExport = () => {
    const csvCols = buildCsvColumns(filter.columns, isForm, tsLabel);
    const rows = filteredRecipients.map((r) => rowToCsv(r, responseType, isForm));
    const today = new Date().toISOString().slice(0, 10);
    const stem = props.exportId ? `recipients-${props.exportId}-${today}` : `recipients-${today}`;
    downloadCsv(`${stem}.csv`, toCsv({ columns: csvCols, rows }));
  };

  return (
    <div className="space-y-4">
      <Toolbar
        filter={filter}
        onFilterChange={onFilterChange}
        classOptions={classOptions}
        responseType={responseType}
        showPgStatus={isForm}
        timestampLabel={tsLabel}
        showParentGuardian={true}
        onExport={handleExport}
      />

      <div className="overflow-x-auto rounded-xl border">
        {filteredRecipients.length === 0 ? (
          <p className="px-6 py-12 text-center text-sm text-muted-foreground">
            No recipients match these filters.
          </p>
        ) : (
          <UnifiedTable
            recipients={filteredRecipients}
            responseType={responseType}
            columns={filter.columns}
            isForm={isForm}
          />
        )}
      </div>
    </div>
  );
}
