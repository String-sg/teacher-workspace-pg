import { CalendarIcon } from 'lucide-react';
import { useMemo } from 'react';

import {
  Calendar,
  Label,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui';
import type { PGEvent } from '~/data/mock-pg-announcements';
import { formatLocalDate } from '~/helpers/dateTime';

interface EventScheduleSectionProps {
  value: PGEvent | undefined;
  onChange: (value: PGEvent | undefined) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Build 30-min time slots for the full 24-hour day. */
function buildTimeSlots(): { value: string; label: string }[] {
  const slots: { value: string; label: string }[] = [];
  for (let h = 0; h < 24; h++) {
    for (const m of [0, 30]) {
      const value = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      const ampmHour = h === 0 ? 12 : h > 12 ? h - 12 : h;
      const label = `${ampmHour}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
      slots.push({ value, label });
    }
  }
  return slots;
}

const TIME_SLOTS = buildTimeSlots();

/** Split a `YYYY-MM-DDTHH:MM` string into its date and time parts. */
function splitDatetime(dt: string): { date: string; time: string } {
  const idx = dt.indexOf('T');
  if (idx === -1) return { date: dt, time: '' };
  return { date: dt.slice(0, idx), time: dt.slice(idx + 1) };
}

/** Parse a `YYYY-MM-DD` string as a local-midnight Date (avoids UTC-shift). */
function isoToLocalDate(dateStr: string): Date | undefined {
  if (!dateStr) return undefined;
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return undefined;
  return new Date(y, m - 1, d);
}

/** Format a local Date back to `YYYY-MM-DD`. */
function localDateToIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

function EventScheduleSection({ value, onChange }: EventScheduleSectionProps) {
  const today = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);

  const startDate = value?.start ? splitDatetime(value.start).date : '';
  const startTime = value?.start ? splitDatetime(value.start).time : '';
  const endDate = value?.end ? splitDatetime(value.end).date : '';
  const endTime = value?.end ? splitDatetime(value.end).time : '';

  const startDateObj = useMemo(() => isoToLocalDate(startDate), [startDate]);
  const endDateObj = useMemo(() => isoToLocalDate(endDate), [endDate]);

  // Display strings shown on the date trigger buttons.
  const startDateLabel = startDate ? (formatLocalDate(startDate) ?? startDate) : null;
  const endDateLabel = endDate ? (formatLocalDate(endDate) ?? endDate) : null;

  // Min date for end calendar = start date (end cannot be before start).
  const endMinDate = startDateObj ?? today;

  function handleStartDateChange(dateStr: string) {
    // Only update the date; keep existing time (or leave empty if none chosen yet).
    const start = startTime ? `${dateStr}T${startTime}` : dateStr;
    onChange({ start, end: value?.end ?? '', venue: value?.venue });
  }

  function handleStartTimeChange(time: string) {
    if (!startDate) return; // date must be chosen first
    const start = `${startDate}T${time}`;
    onChange({ start, end: value?.end ?? '', venue: value?.venue });
  }

  function handleEndDateChange(dateStr: string) {
    const end = endTime ? `${dateStr}T${endTime}` : dateStr;
    const start = value?.start ?? '';
    onChange({ start: start || end, end, venue: value?.venue });
  }

  function handleEndTimeChange(time: string) {
    if (!endDate) return;
    const end = `${endDate}T${time}`;
    const start = value?.start ?? '';
    onChange({ start: start || end, end, venue: value?.venue });
  }

  const triggerClass =
    'inline-flex h-9 min-w-[148px] items-center gap-2 rounded-[14px] border border-input bg-background px-3 text-sm text-left font-normal transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50';

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-medium">
          Event Schedule{' '}
          <span className="text-xs font-normal text-muted-foreground">(optional)</span>
        </p>
        <p className="text-sm text-muted-foreground">
          When the event takes place. Parents see this in the post header.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {/* Start */}
        <div className="space-y-1.5">
          <Label>Start (SGT)</Label>
          <div className="flex flex-wrap gap-2">
            <Popover>
              <PopoverTrigger className={triggerClass}>
                <CalendarIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                {startDateLabel ?? <span className="text-muted-foreground">Pick a date</span>}
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={startDateObj}
                  onSelect={(date) => {
                    if (date) handleStartDateChange(localDateToIso(date));
                  }}
                  disabled={{ before: today }}
                  autoFocus
                />
              </PopoverContent>
            </Popover>

            <Select
              value={startTime || undefined}
              onValueChange={(v) => {
                if (v !== null) handleStartTimeChange(v);
              }}
              disabled={!startDate}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Time" />
              </SelectTrigger>
              <SelectContent>
                {TIME_SLOTS.map((slot) => (
                  <SelectItem key={slot.value} value={slot.value}>
                    {slot.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* End */}
        <div className="space-y-1.5">
          <Label>End (SGT)</Label>
          <div className="flex flex-wrap gap-2">
            <Popover>
              <PopoverTrigger className={triggerClass} disabled={!startDate}>
                <CalendarIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                {endDateLabel ?? <span className="text-muted-foreground">Pick a date</span>}
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={endDateObj}
                  onSelect={(date) => {
                    if (date) handleEndDateChange(localDateToIso(date));
                  }}
                  disabled={{ before: endMinDate }}
                  autoFocus
                />
              </PopoverContent>
            </Popover>

            <Select
              value={endTime || undefined}
              onValueChange={(v) => {
                if (v !== null) handleEndTimeChange(v);
              }}
              disabled={!startDate}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Time" />
              </SelectTrigger>
              <SelectContent>
                {TIME_SLOTS.map((slot) => (
                  <SelectItem key={slot.value} value={slot.value}>
                    {slot.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );
}

export { EventScheduleSection };
export type { EventScheduleSectionProps };
