import { Columns2, SlidersHorizontal } from 'lucide-react';

import {
  Button,
  Checkbox,
  Label,
  Popover,
  PopoverContent,
  PopoverTrigger,
  RadioGroup,
  RadioGroupItem,
} from '~/components/ui';
import type { ResponseType } from '~/data/mock-pg-announcements';

export type StatusFilter =
  | 'all'
  | 'read'
  | 'unread' // view-only
  | 'acknowledged'
  | 'pending' // acknowledge
  | 'yes'
  | 'no'
  | 'no-response'; // yes-no

export type PgStatusFilter = 'all' | 'onboarded' | 'not-onboarded';

/**
 * Four optional columns. Student and Class are identity anchors and are always
 * visible — not toggleable (mirrors PGW's "Show Columns" behaviour).
 * Status is also always shown. The four keys here are the optional extras.
 */
export type ColumnKey = 'indexNumber' | 'timestamp' | 'parentGuardian' | 'pgStatus';
export type ColumnVisibility = Record<ColumnKey, boolean>;

export interface RecipientFilterValue {
  classId: string;
  /** Unified status filter — valid values depend on the post's `responseType`. */
  status: StatusFilter;
  pg: PgStatusFilter;
  /** Live search string — matched against studentName + classLabel. */
  search: string;
  columns: ColumnVisibility;
}

/** Default column visibility: timestamp + parentGuardian + pgStatus on; indexNumber off. */
export const DEFAULT_COLUMN_VISIBILITY: ColumnVisibility = {
  indexNumber: false,
  timestamp: true,
  parentGuardian: true,
  pgStatus: true,
};

export const DEFAULT_RECIPIENT_FILTER: RecipientFilterValue = {
  classId: 'all',
  status: 'all',
  pg: 'all',
  search: '',
  columns: DEFAULT_COLUMN_VISIBILITY,
};

/**
 * Count of active (non-default) filters. Columns are intentionally excluded —
 * column visibility is a display preference, not a filter in the narrowing sense.
 */
export function countActiveFilters(v: RecipientFilterValue): number {
  let n = 0;
  if (v.classId !== 'all') n += 1;
  if (v.status !== 'all') n += 1;
  if (v.pg !== 'all') n += 1;
  return n;
}

// ─── Filter popover ───────────────────────────────────────────────────────────

interface RecipientFilterPopoverProps {
  value: RecipientFilterValue;
  onChange: (next: RecipientFilterValue) => void;
  /** Distinct class labels present in the current recipient set. */
  classOptions: string[];
  /**
   * Determines which status options to render:
   * - `view-only` → Read / Unread
   * - `acknowledge` → Acknowledged / Pending
   * - `yes-no` → Yes / No / No Response
   */
  responseType: ResponseType | 'acknowledge' | 'yes-no';
  /** Hide the PG Status section for announcement kinds (BFF doesn't surface it). */
  showPgStatus?: boolean;
}

function RecipientFilterPopover({
  value,
  onChange,
  classOptions,
  responseType,
  showPgStatus = true,
}: RecipientFilterPopoverProps) {
  const active = countActiveFilters(value);
  const isDefault = value.classId === 'all' && value.status === 'all' && value.pg === 'all';

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button variant="secondary" size="sm" aria-label="Filter recipients">
            <SlidersHorizontal className="h-4 w-4" />
            Filter
            {active > 0 && (
              <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-medium text-primary-foreground">
                {active}
              </span>
            )}
          </Button>
        }
      />
      <PopoverContent align="end" className="w-60 gap-5">
        <p className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
          Filters
        </p>

        <FilterSection label="Class">
          <RadioGroup
            value={value.classId}
            onValueChange={(v) => onChange({ ...value, classId: v })}
            className="gap-2"
          >
            <RadioOption value="all" label="All classes" />
            {classOptions.map((cls) => (
              <RadioOption key={cls} value={cls} label={cls} />
            ))}
          </RadioGroup>
        </FilterSection>

        <FilterSection label="Status">
          <RadioGroup
            value={value.status}
            onValueChange={(v) => onChange({ ...value, status: v as StatusFilter })}
            className="gap-2"
          >
            <RadioOption value="all" label="All" />
            {responseType === 'view-only' && (
              <>
                <RadioOption value="read" label="Read" />
                <RadioOption value="unread" label="Unread" />
              </>
            )}
            {responseType === 'acknowledge' && (
              <>
                <RadioOption value="acknowledged" label="Acknowledged" />
                <RadioOption value="pending" label="Pending" />
              </>
            )}
            {responseType === 'yes-no' && (
              <>
                <RadioOption value="yes" label="Yes" />
                <RadioOption value="no" label="No" />
                <RadioOption value="no-response" label="No Response" />
              </>
            )}
          </RadioGroup>
        </FilterSection>

        {showPgStatus && (
          <FilterSection label="PG status">
            <RadioGroup
              value={value.pg}
              onValueChange={(v) => onChange({ ...value, pg: v as PgStatusFilter })}
              className="gap-2"
            >
              <RadioOption value="all" label="All" />
              <RadioOption value="onboarded" label="Onboarded" />
              <RadioOption value="not-onboarded" label="Not Onboarded" />
            </RadioGroup>
          </FilterSection>
        )}

        {!isDefault && (
          <button
            className="cursor-pointer text-xs text-muted-foreground underline-offset-2 hover:underline"
            onClick={() => onChange({ ...value, classId: 'all', status: 'all', pg: 'all' })}
          >
            Reset all filters
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}

// ─── Column popover ───────────────────────────────────────────────────────────

interface RecipientColumnPopoverProps {
  value: ColumnVisibility;
  onChange: (next: ColumnVisibility) => void;
  /** Label for the Timestamp column adapts to post type (Read At / Responded At / Acknowledged At). */
  timestampLabel: string;
  /** Hide Parent/Guardian column option for announcement kinds (BFF doesn't surface it). */
  showParentGuardian?: boolean;
}

function RecipientColumnPopover({
  value,
  onChange,
  timestampLabel,
  showParentGuardian = true,
}: RecipientColumnPopoverProps) {
  const columnDefs: { key: ColumnKey; label: string; show: boolean }[] = [
    { key: 'indexNumber', label: 'Index No.', show: true },
    { key: 'timestamp', label: timestampLabel, show: true },
    { key: 'parentGuardian', label: 'Parent/Guardian', show: showParentGuardian },
    { key: 'pgStatus', label: 'PG Status', show: true },
  ];

  const visibleDefs = columnDefs.filter((d) => d.show);

  const allOn = visibleDefs.every((d) => value[d.key]);
  const allOff = visibleDefs.every((d) => !value[d.key]);

  function setAll(visible: boolean) {
    const next = { ...value };
    for (const d of visibleDefs) next[d.key] = visible;
    onChange(next);
  }

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button variant="secondary" size="sm" aria-label="Show/hide columns">
            <Columns2 className="h-4 w-4" />
            Columns
          </Button>
        }
      />
      <PopoverContent align="end" className="w-52 gap-4">
        <p className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
          Columns
        </p>

        <div className="flex flex-col gap-2">
          {visibleDefs.map((def) => (
            <CheckboxOption
              key={def.key}
              label={def.label}
              checked={value[def.key]}
              onCheckedChange={(checked) => onChange({ ...value, [def.key]: checked })}
            />
          ))}
        </div>

        <div className="flex items-center gap-2 border-t pt-2">
          <button
            className="cursor-pointer text-xs text-muted-foreground underline-offset-2 hover:underline disabled:opacity-40"
            disabled={allOn}
            onClick={() => setAll(true)}
          >
            Show all
          </button>
          <span className="text-muted-foreground/40">·</span>
          <button
            className="cursor-pointer text-xs text-muted-foreground underline-offset-2 hover:underline disabled:opacity-40"
            disabled={allOff}
            onClick={() => setAll(false)}
          >
            Hide all
          </button>
          <span className="text-muted-foreground/40">·</span>
          <button
            className="cursor-pointer text-xs text-muted-foreground underline-offset-2 hover:underline"
            onClick={() => onChange(DEFAULT_COLUMN_VISIBILITY)}
          >
            Reset
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function FilterSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{label}</p>
      {children}
    </div>
  );
}

function RadioOption({ value, label }: { value: string; label: string }) {
  return (
    <label className="flex cursor-pointer items-center gap-2">
      <RadioGroupItem value={value} />
      <Label className="cursor-pointer text-sm font-normal">{label}</Label>
    </label>
  );
}

function CheckboxOption({
  label,
  checked,
  onCheckedChange,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2">
      <Checkbox checked={checked} onCheckedChange={(next) => onCheckedChange(next === true)} />
      <Label className="cursor-pointer text-sm font-normal">{label}</Label>
    </label>
  );
}

export { RecipientFilterPopover, RecipientColumnPopover };
export type { RecipientFilterPopoverProps, RecipientColumnPopoverProps };
