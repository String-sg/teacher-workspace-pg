import { CalendarIcon } from 'lucide-react';
import { useMemo } from 'react';

import { Calendar, Label, Popover, PopoverContent, PopoverTrigger } from '~/components/ui';
import { formatLocalDate } from '~/helpers/dateTime';

interface DueDateSectionProps {
  value: string; // YYYY-MM-DD
  onChange: (value: string) => void;
  required?: boolean;
}

/** Parse a `YYYY-MM-DD` string as a local-midnight Date (avoids UTC-shift). */
function isoToLocalDate(iso: string): Date | undefined {
  if (!iso) return undefined;
  const [y, m, d] = iso.split('-').map(Number);
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

function DueDateSection({ value, onChange, required = false }: DueDateSectionProps) {
  const today = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);

  const selected = useMemo(() => isoToLocalDate(value), [value]);
  const formattedDate = value ? (formatLocalDate(value) ?? value) : null;

  return (
    <div className="space-y-1.5">
      <Label>Due Date (SGT){required && <span className="text-destructive"> *</span>}</Label>
      <p className="text-sm text-muted-foreground">
        The latest date by which parents must respond.
      </p>

      <Popover>
        <PopoverTrigger className="inline-flex h-9 w-[240px] items-center gap-2 rounded-[14px] border border-input bg-background px-3 text-left text-sm font-normal transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none">
          <CalendarIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
          {formattedDate ?? <span className="text-muted-foreground">Pick a date</span>}
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selected}
            onSelect={(date) => {
              if (date) onChange(localDateToIso(date));
            }}
            disabled={{ before: today }}
            autoFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

export { DueDateSection };
export type { DueDateSectionProps };
