import { Checkbox, Label } from '~/components/ui';

/**
 * PG's two shortcut keys. See `PG-API-CONTRACT.md:218`; the wire contract
 * accepts the enum keys directly on `shortcutLink`. Labels track the PG
 * parent-app copy ("Declare travels", "Edit contact details").
 */
const SHORTCUT_KEYS = {
  TRAVEL_DECLARATION: 'TRAVEL_DECLARATION',
  EDIT_CONTACT_DETAILS: 'EDIT_CONTACT_DETAILS',
} as const;

type ShortcutKey = (typeof SHORTCUT_KEYS)[keyof typeof SHORTCUT_KEYS];

interface ShortcutItem {
  key: ShortcutKey;
  label: string;
  /**
   * Whether this shortcut is allowed by PG's feature flags for the current
   * school. When false the checkbox is hidden — matches the plan's silent
   * fallback (no "this feature is unavailable" banner).
   */
  available: boolean;
}

interface ShortcutsSectionProps {
  /** Currently-enabled shortcut keys. */
  value: string[];
  /** Called with the next full list of enabled keys — mirrors the other sections. */
  onChange: (next: string[]) => void;
  /** PG flag: `absence_submission` gates the Declare-travels shortcut. */
  declareTravelsEnabled: boolean;
  /**
   * PG doesn't name a flag for the Edit-contact shortcut in the fixture; the
   * plan flags this as a TODO. Treat as always-available until PG confirms a
   * gating flag. Passing `false` hides it defensively.
   */
  editContactEnabled: boolean;
}

function ShortcutsSection({
  value,
  onChange,
  declareTravelsEnabled,
  editContactEnabled,
}: ShortcutsSectionProps) {
  const items: ShortcutItem[] = [
    {
      key: SHORTCUT_KEYS.TRAVEL_DECLARATION,
      label: 'Declare travels',
      available: declareTravelsEnabled,
    },
    {
      key: SHORTCUT_KEYS.EDIT_CONTACT_DETAILS,
      label: 'Edit contact details',
      // TODO: PG hasn't named a flag for this one. Until then we treat
      // it as always-on; container passes `true` via the loader. If PG
      // surfaces a flag (e.g. `edit_contact_details`), wire it here.
      available: editContactEnabled,
    },
  ];

  const visible = items.filter((item) => item.available);
  if (visible.length === 0) {
    // Both flags off — render nothing rather than an empty card.
    return null;
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">
        Shortcuts <span className="text-xs font-normal text-muted-foreground">(optional)</span>
      </p>

      <div className="space-y-2">
        {visible.map((item) => {
          const inputId = `shortcut-${item.key.toLowerCase()}`;
          const checked = value.includes(item.key);
          return (
            <label
              key={item.key}
              htmlFor={inputId}
              className="flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 transition-colors hover:bg-muted/40"
            >
              <Checkbox
                id={inputId}
                checked={checked}
                onCheckedChange={(next) => {
                  const enabled = next === true;
                  if (enabled && !checked) onChange([...value, item.key]);
                  else if (!enabled && checked) onChange(value.filter((k) => k !== item.key));
                }}
              />
              <Label htmlFor={inputId} className="cursor-pointer">
                {item.label}
              </Label>
            </label>
          );
        })}
      </div>
    </div>
  );
}

export { ShortcutsSection, SHORTCUT_KEYS };
export type { ShortcutsSectionProps };
