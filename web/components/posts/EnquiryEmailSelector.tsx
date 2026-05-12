import { ChevronDown } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

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

  const domains = useMemo(() => {
    const fromOptions = emailOptions
      .map((e) => e.split('@')[1])
      .filter((d): d is string => Boolean(d));
    return Array.from(new Set([...fromOptions, 'gmail.com', 'moe.edu.sg', 'schools.gov.sg']));
  }, [emailOptions]);

  const isPreset = emailOptions.includes(value);
  const hasCustomValue = !isPreset && Boolean(value);

  // ── Internal form state for the "Other" row ────────────────────────────────
  const [showOther, setShowOther] = useState(false);
  const [customUsername, setCustomUsername] = useState('');
  const [customDomain, setCustomDomain] = useState<string>(domains[0]);
  const usernameRef = useRef<HTMLInputElement>(null);

  // Sync form state whenever the popover opens.
  useEffect(() => {
    if (!open) return;
    if (hasCustomValue) {
      const atIdx = value.lastIndexOf('@');
      const user = atIdx > 0 ? value.slice(0, atIdx) : value;
      const domain = atIdx > 0 ? value.slice(atIdx + 1) : '';
      setCustomUsername(user);
      setCustomDomain(domains.includes(domain) ? domain : domains[0]);
      setShowOther(true);
    } else {
      setShowOther(false);
      setCustomUsername('');
      setCustomDomain(domains[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function handleSelectPreset(email: string) {
    onChange(email);
    setShowOther(false);
    setOpen(false);
  }

  function handleSelectOther() {
    setShowOther(true);
    // Pre-fill from current custom value if one exists, otherwise start fresh.
    if (!hasCustomValue) {
      setCustomUsername('');
      setCustomDomain(domains[0]);
    }
    setTimeout(() => usernameRef.current?.focus(), 0);
  }

  function handleConfirm() {
    const trimmed = customUsername.trim();
    if (!trimmed) return;
    onChange(`${trimmed}@${customDomain}`);
    setOpen(false);
  }

  const customIsValid = Boolean(customUsername.trim());

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (!next) setShowOther(hasCustomValue);
        setOpen(next);
      }}
    >
      {/* Wrapper lets the × button sit outside the trigger without nesting */}
      <div className="relative w-full">
        <PopoverTrigger
          aria-invalid={ariaInvalid}
          className={cn(
            'flex h-9 w-full cursor-pointer items-center gap-1.5 rounded-[14px] border border-input bg-input/30 py-2 pl-3 text-sm whitespace-nowrap transition-colors outline-none hover:border-ring/40 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-[3px] aria-invalid:ring-destructive/20',
            'pr-3',
          )}
        >
          <span className={cn('flex-1 truncate text-left', !value && 'text-muted-foreground')}>
            {value || 'Select an email…'}
          </span>
          <ChevronDown className="pointer-events-none size-4 shrink-0 text-muted-foreground" />
        </PopoverTrigger>
      </div>

      <PopoverContent
        align="start"
        sideOffset={4}
        className="w-(--anchor-width) min-w-72 gap-0 p-0"
      >
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-sm font-medium">Enquiry email</span>
          <span className="text-xs text-muted-foreground">Select one</span>
        </div>
        <Separator />

        {/* ── Preset options ─────────────────────────────────────────────── */}
        <div className="py-1">
          {emailOptions.map((email) => (
            <button
              key={email}
              type="button"
              onClick={() => handleSelectPreset(email)}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-sm hover:bg-accent hover:text-accent-foreground"
            >
              <RadioDot selected={value === email} />
              <span className="truncate">{email}</span>
            </button>
          ))}
        </div>

        <Separator />

        {/* ── "Other" row — expands inline when selected ─────────────────── */}
        <div className="py-1">
          <button
            type="button"
            onClick={handleSelectOther}
            className="flex w-full items-center gap-3 px-4 py-2.5 text-sm hover:bg-accent hover:text-accent-foreground"
          >
            <RadioDot selected={showOther} />
            <span
              className={cn('truncate', !showOther ? 'text-muted-foreground' : 'text-foreground')}
            >
              {showOther && customUsername ? `${customUsername}@${customDomain}` : 'Other…'}
            </span>
          </button>

          {showOther && (
            <div className="space-y-2.5 px-4 pb-3">
              {/* Username + domain pill toggle */}
              <div className="flex items-center gap-1.5">
                <Input
                  ref={usernameRef}
                  type="text"
                  placeholder="username"
                  value={customUsername}
                  onChange={(e) => setCustomUsername(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
                  className="min-w-0 flex-1"
                />
                <span className="shrink-0 text-sm text-muted-foreground">@</span>
                <Select value={customDomain} onValueChange={setCustomDomain}>
                  <SelectTrigger className="w-[11rem] shrink-0">
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

              <Button
                type="button"
                size="sm"
                className="w-full"
                disabled={!customIsValid}
                onClick={handleConfirm}
              >
                {hasCustomValue ? 'Update' : 'Confirm'}
              </Button>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function RadioDot({ selected }: { selected: boolean }) {
  return (
    <span
      className={cn(
        'flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
        selected ? 'border-primary bg-primary' : 'border-muted-foreground/40',
      )}
    >
      {selected && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
    </span>
  );
}
