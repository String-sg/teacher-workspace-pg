import type { PGApiSchoolStaff, PGApiStaffGroups } from '~/api/types';

import { EntitySelector } from './entity-selector';
import type { EntityItem, EntityScope, SearchResults, SelectedEntity } from './entity-selector';

export type { SelectedEntity as SelectedStaff };

interface StaffSelectorProps {
  value: SelectedEntity[];
  onChange: (staff: SelectedEntity[]) => void;
  staff: PGApiSchoolStaff[];
  staffGroups?: PGApiStaffGroups;
}

export function StaffSelector({ value, onChange, staff, staffGroups }: StaffSelectorProps) {
  const byName = new Map(staff.map((s) => [s.name, s]));

  const individualItems: EntityItem[] = staff.map((s) => ({
    id: s.staffId.toString(),
    label: s.name,
    sublabel: [s.className, s.email].filter(Boolean).join(' · '),
    type: 'individual',
    count: 1,
  }));

  const levelItems: EntityItem[] = (staffGroups?.level ?? []).map((g) => ({
    id: g.id,
    label: g.label,
    type: 'group',
    count: g.count,
    groupType: 'staff-group',
    memberNames: g.memberNames,
    memberDetails: g.memberNames?.map((name) => ({
      id: byName.get(name)?.staffId.toString(),
      name,
    })),
  }));

  const schoolItems: EntityItem[] = (staffGroups?.school ?? []).map((g) => ({
    id: g.id,
    label: g.label,
    type: 'group',
    count: g.count,
    groupType: 'staff-group',
    memberNames: g.memberNames,
    memberDetails: g.memberNames?.map((name) => ({
      id: byName.get(name)?.staffId.toString(),
      name,
    })),
  }));

  const scopes: EntityScope[] = [
    { id: 'individual', label: 'Individual', items: individualItems },
    { id: 'level', label: 'Level', items: levelItems },
    { id: 'school', label: 'School', items: schoolItems },
  ];

  const allGroups = [...levelItems, ...schoolItems];

  function searchFn(query: string): SearchResults {
    const q = query.toLowerCase();
    if (!q) return { groups: [], individuals: individualItems };
    return {
      groups: allGroups.filter((g) => g.label.toLowerCase().includes(q)),
      individuals: individualItems.filter(
        (s) =>
          s.label.toLowerCase().includes(q) || (s.sublabel?.toLowerCase().includes(q) ?? false),
      ),
    };
  }

  return (
    <EntitySelector
      value={value}
      onChange={onChange}
      scopes={scopes}
      searchFn={searchFn}
      placeholder="Search staff by name or group…"
      searchPlaceholder="Search staff…"
      noResultsText="No staff found"
    />
  );
}
