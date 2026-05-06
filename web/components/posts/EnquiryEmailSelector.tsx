import { ChevronDown } from 'lucide-react';
import { useMemo, useState } from 'react';

import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui';
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover';
import { Separator } from '~/components/ui/separator';
import { cn } from '~/lib/utils';

interface EnquiryEmailSelectorProps {
  emailOptions: string[];
  value: string;
  onChange: (email: string) => void;
  'aria-invalid'?: boolean;
}

export function EnquiryEmailSelector({
  emailOptions,
  value,
  onChange,
  'aria-invalid': ariaInvalid,
}: EnquiryEmailSelectorProps) {
  const [open, setOpen] = useState(false);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customUsername, setCustomUsername] = useState('');
  const [customDomain, setCustomDomain] = useState('');

  const domains = useMemo(() => {
    const fromOptions = emailOptions
      .map((e) => e.split('@')[1])
      .filter((d): d is string => Boolean(d));
    return Array.from(new Set([...fromOptions, 'moe.edu.sg', 'schools.gov.sg']));
  }, [emailOptions]);

  const isPreset = emailOptions.includes(value);
  const hasCustomValue = !isPreset && Boolean(value);

  function selectPreset(email: string) {
    onChange(email);
    setShowCustomForm(false);
    setOpen(false);
  }

  function openCustomForm() {
    if (hasCustomValue) {
      const atIdx = value.lastIndexOf('@');
      const user = atIdx > 0 ? value.slice(0, atIdx) : value;
      const domain = atIdx > 0 ? value.slice(atIdx + 1) : '';
      setCustomUsername(user);
      setCustomDomain(domains.includes(domain) ? domain : (domains[0] ?? 'moe.edu.sg'));
    } else {
      setCustomUsername('');
      setCustomDomain(domains[0] ?? 'moe.edu.sg');
    }
    setShowCustomForm(true);
  }

  function addCustomEmail() {
    const trimmed = customUsername.trim();
    if (!trimmed) return;
    onChange(`${trimmed}@${customDomain}`);
    setShowCustomForm(false);
    setOpen(false);
  }

  function cancelCustomForm() {
    setShowCustomForm(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        aria-invalid={ariaInvalid}
        className={cn(
          'flex h-9 w-full items-center justify-between gap-1.5 rounded-[14px] border border-input bg-input/30 px-3 py-2 text-sm whitespace-nowrap transition-colors outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-[3px] aria-invalid:ring-destructive/20',
        )}
      >
        <span className={cn('flex-1 truncate text-left', !value && 'text-muted-foreground')}>
          {value || 'Select or add an email…'}
        </span>
        <ChevronDown className="pointer-events-none size-4 shrink-0 text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={4}
        className="w-(--anchor-width) min-w-72 gap-0 p-0"
      >
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-sm font-medium">Enquiry email</span>
          <span className="text-xs text-muted-foreground">1 max</span>
        </div>
        <Separator />
        <div className="py-1">
          {emailOptions.map((email) => (
            <button
              key={email}
              type="button"
              onClick={() => selectPreset(email)}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-sm hover:bg-accent hover:text-accent-foreground"
            >
              <RadioDot selected={value === email} />
              <span className="truncate">{email}</span>
            </button>
          ))}
        </div>
        <Separator />
        {showCustomForm ? (
          <div className="space-y-2.5 p-3">
            <div className="flex items-center gap-1.5">
              <Input
                autoFocus
                type="text"
                placeholder="username"
                value={customUsername}
                onChange={(e) => setCustomUsername(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addCustomEmail()}
                className="min-w-0 flex-1"
              />
              <span className="shrink-0 text-sm text-muted-foreground">@</span>
              <Select value={customDomain} onValueChange={setCustomDomain}>
                <SelectTrigger className="w-[10rem] shrink-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {domains.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                className="flex-1"
                disabled={!customUsername.trim()}
                onClick={addCustomEmail}
              >
                Add & select
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={cancelCustomForm}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={openCustomForm}
            className="flex w-full items-center gap-3 px-4 py-2.5 text-sm hover:bg-accent hover:text-accent-foreground"
          >
            <RadioDot selected={hasCustomValue} />
            <span className={cn('truncate', !hasCustomValue && 'text-muted-foreground')}>
              {hasCustomValue ? value : 'Other (please specify)'}
            </span>
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}

function RadioDot({ selected }: { selected: boolean }) {
  return (
    <span
      className={cn(
        'flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2',
        selected ? 'border-primary bg-primary' : 'border-muted-foreground/40',
      )}
    >
      {selected && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
    </span>
  );
}
