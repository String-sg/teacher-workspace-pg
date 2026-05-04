import { Check, ChevronDown, Minus, Plus, Search, User, Users, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router';

import { Badge } from '~/components/ui/badge';
import { Sheet, SheetContent } from '~/components/ui/sheet';
import { useIsMobile } from '~/hooks/useIsMobile';
import { cn } from '~/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type GroupType =
  | 'class'
  | 'level'
  | 'school'
  | 'cca'
  | 'teaching'
  | 'custom'
  | 'department'
  | 'staff-group';

export interface MemberDetail {
  id?: string; // entity ID for individual selection
  name: string;
  tag?: string; // inline badge next to name (e.g. class label when group is not a class)
  sublabel?: string; // e.g. "3A · tanml@school.edu.sg" for staff
  badge?: string; // right-aligned label (e.g. NRIC for students)
}

export interface EntityItem {
  id: string;
  label: string;
  sublabel?: string;
  badge?: string; // right-aligned label on the name row (e.g. NRIC for students)
  type: 'group' | 'individual';
  count?: number;
  memberNames?: string[]; // plain names for chip tooltips
  memberDetails?: MemberDetail[]; // richer per-member info for expanded list
  groupType?: GroupType;
}

export interface SelectedEntity {
  id: string;
  label: string;
  type: 'group' | 'individual';
  count: number;
  groupType?: GroupType;
  memberNames?: string[];
  excludedMemberNames?: string[];
  role?: 'viewer' | 'editor';
}

export interface ScopeSection {
  label: string;
  items: EntityItem[];
}

export interface EntityScope {
  id: string;
  label: string;
  items: EntityItem[];
  sections?: ScopeSection[];
  createHref?: string;
  createLabel?: string;
}

export interface SearchResults {
  groups: EntityItem[];
  individuals: EntityItem[];
}

export interface EntitySelectorProps {
  value: SelectedEntity[];
  onChange: (entities: SelectedEntity[]) => void;
  scopes?: EntityScope[];
  searchFn: (query: string) => SearchResults;
  multiSelect?: boolean;
  placeholder?: string;
  searchPlaceholder?: string;
  noResultsText?: string;
  emptyTabText?: string;
  maxScrollHeight?: string;
  showRole?: boolean;
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

// Returns the unit label for a group's member count.
// Student-oriented groups use "student(s)"; staff/generic groups use "member(s)".
function getCountUnit(groupType: GroupType | undefined, count: number): string {
  const studentTypes: GroupType[] = ['class', 'level', 'school', 'cca', 'teaching', 'custom'];
  if (groupType && studentTypes.includes(groupType)) {
    return count === 1 ? 'student' : 'students';
  }
  return count === 1 ? 'member' : 'members';
}

export function computeSummary(
  entities: SelectedEntity[],
  summaryLabel: string,
  summaryLabelPlural: string,
): string {
  if (entities.length === 0) return '';

  const groups = entities.filter((e) => e.type === 'group');
  const individuals = entities.filter((e) => e.type === 'individual');
  const totalCount = entities.reduce((sum, e) => sum + e.count, 0);
  const hasGroups = groups.length > 0;

  const byType = new Map<string, number>();
  for (const g of groups) {
    const key = g.groupType ?? 'staff-group';
    byType.set(key, (byType.get(key) ?? 0) + 1);
  }

  const typeOrder: GroupType[] = [
    'school',
    'level',
    'class',
    'cca',
    'teaching',
    'custom',
    'department',
    'staff-group',
  ];
  const typeLabels: Record<string, [string, string]> = {
    school: ['school', 'schools'],
    level: ['level', 'levels'],
    class: ['class', 'classes'],
    cca: ['CCA', 'CCAs'],
    teaching: ['teaching group', 'teaching groups'],
    custom: ['custom group', 'custom groups'],
    department: ['dept', 'depts'],
    'staff-group': ['group', 'groups'],
  };

  const parts: string[] = [];

  for (const type of typeOrder) {
    const count = byType.get(type) ?? 0;
    if (count === 0) continue;
    const pair = typeLabels[type] ?? [type, `${type}s`];
    parts.push(`${count} ${count === 1 ? pair[0] : pair[1]}`);
  }

  if (individuals.length > 0) {
    parts.push(`${individuals.length} individual${individuals.length !== 1 ? 's' : ''}`);
  }

  const countStr = `${hasGroups ? '~' : ''}${totalCount} ${totalCount === 1 ? summaryLabel : summaryLabelPlural}`;
  return [...parts, countStr].join(' · ');
}

export function detectOverlaps(
  entities: SelectedEntity[],
  overlapMap: Record<string, string[]>,
): { childLabel: string; parentLabel: string }[] {
  const selectedIds = new Set(entities.map((e) => e.id));
  const warnings: { childLabel: string; parentLabel: string }[] = [];

  for (const [parentId, childIds] of Object.entries(overlapMap)) {
    if (!selectedIds.has(parentId)) continue;
    const parent = entities.find((e) => e.id === parentId);
    if (!parent) continue;
    for (const childId of childIds) {
      if (!selectedIds.has(childId)) continue;
      const child = entities.find((e) => e.id === childId);
      if (!child) continue;
      warnings.push({ childLabel: child.label, parentLabel: parent.label });
    }
  }

  return warnings;
}

function toSelectedEntity(item: EntityItem): SelectedEntity {
  return {
    id: item.id,
    label: item.label,
    type: item.type,
    count: item.count ?? 1,
    groupType: item.groupType,
    memberNames: item.memberNames,
  };
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface ResultRowProps {
  item: EntityItem;
  isSelected: boolean;
  onToggle: () => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  selectedIndividualIds?: Set<string>;
  excludedMemberNames?: Set<string>;
  onMemberToggle?: (name: string) => void;
  onIndividualSelect?: (id: string, label: string) => void;
}

function ResultRow({
  item,
  isSelected,
  onToggle,
  isExpanded = false,
  onToggleExpand,
  selectedIndividualIds = new Set<string>(),
  excludedMemberNames = new Set(),
  onMemberToggle,
  onIndividualSelect,
}: ResultRowProps) {
  const hasMembers =
    item.type === 'group' &&
    ((item.memberDetails?.length ?? 0) > 0 || (item.memberNames?.length ?? 0) > 0);

  return (
    <>
      {/* Row: selection area + expand chevron as siblings inside a flex div */}
      <div
        className={cn(
          'flex w-full transition-colors',
          isSelected ? 'bg-twblue-1' : 'hover:bg-slate-2',
        )}
      >
        {/* Selection toggle — takes all available space */}
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={onToggle}
          aria-pressed={isSelected}
          className="flex flex-1 items-center gap-3 px-3 py-2 text-left text-sm"
        >
          {/* Checkbox */}
          <span
            className={cn(
              'flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded border-2 transition-colors',
              isSelected ? 'border-primary bg-primary text-white' : 'border-border bg-background',
            )}
          >
            {isSelected && excludedMemberNames.size === 0 && <Check className="h-3 w-3" />}
            {isSelected && excludedMemberNames.size > 0 && <Minus className="h-3 w-3" />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{item.label}</p>
            {item.sublabel && (
              <p className="truncate text-xs text-muted-foreground">{item.sublabel}</p>
            )}
          </div>
          {item.type === 'group' && item.count !== undefined && (
            <span className="shrink-0 text-xs text-muted-foreground">
              {excludedMemberNames.size > 0
                ? `${item.count - excludedMemberNames.size} / ${item.count}`
                : item.count}{' '}
              {getCountUnit(item.groupType, item.count - excludedMemberNames.size)}
            </span>
          )}
          {item.badge && (
            <span className="shrink-0 font-mono text-xs text-muted-foreground">{item.badge}</span>
          )}
        </button>

        {/* Expand chevron — only for groups with member names */}
        {hasMembers && (
          <button
            type="button"
            aria-label={isExpanded ? 'Hide members' : 'Show members'}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onToggleExpand?.()}
            className={cn(
              'flex shrink-0 items-center px-2 transition-colors',
              isSelected ? 'hover:bg-twblue-3' : 'hover:bg-muted',
            )}
          >
            <ChevronDown
              className={cn(
                'h-3.5 w-3.5 text-muted-foreground transition-transform duration-150',
                isExpanded && 'rotate-180',
              )}
            />
          </button>
        )}
      </div>

      {/* Expanded member list */}
      {isExpanded && hasMembers && (
        <div className="border-b border-slate-3 bg-slate-2/60 px-4 pt-2.5 pb-3">
          {/* Full member list */}
          <div style={{ scrollbarWidth: 'thin' }}>
            {(item.memberDetails ?? item.memberNames!.map((name): MemberDetail => ({ name }))).map(
              (detail, index) => {
                const isMemberIncluded = isSelected
                  ? !excludedMemberNames.has(detail.name)
                  : Boolean(detail.id && selectedIndividualIds.has(detail.id));
                const isInteractive = isSelected || Boolean(detail.id && onIndividualSelect);
                return (
                  <button
                    key={detail.name}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      if (isSelected) {
                        onMemberToggle?.(detail.name);
                      } else if (detail.id) {
                        onIndividualSelect?.(detail.id, detail.name);
                      }
                    }}
                    className={cn(
                      'flex w-full items-center gap-2 rounded px-1.5 py-1 text-xs',
                      isInteractive ? 'cursor-pointer hover:bg-muted' : 'cursor-default',
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded border-2 transition-colors',
                        isMemberIncluded
                          ? 'border-primary bg-primary text-white'
                          : 'border-border bg-background',
                      )}
                    >
                      {isMemberIncluded && <Check className="h-3 w-3" />}
                    </span>
                    <span className="w-5 shrink-0 text-right text-[10px] text-slate-9 tabular-nums">
                      #{index + 1}
                    </span>
                    <span className="flex min-w-0 flex-1 items-center gap-1.5 text-left">
                      <span
                        className={cn(
                          'truncate font-medium',
                          isMemberIncluded ? 'text-foreground' : 'text-slate-9',
                        )}
                      >
                        {detail.name}
                      </span>
                      {detail.tag && (
                        <Badge variant="secondary" className="shrink-0 text-[10px]">
                          {detail.tag}
                        </Badge>
                      )}
                    </span>
                    {detail.sublabel && (
                      <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                        {detail.sublabel}
                      </span>
                    )}
                    {detail.badge && (
                      <span className="shrink-0 font-mono text-[10px] text-slate-9">
                        {detail.badge}
                      </span>
                    )}
                  </button>
                );
              },
            )}
          </div>
        </div>
      )}
    </>
  );
}

function EntityChip({
  entity,
  onRemove,
  onRoleChange,
}: {
  entity: SelectedEntity;
  onRemove: () => void;
  onRoleChange?: (role: 'viewer' | 'editor') => void;
}) {
  const names = entity.memberNames ?? [];
  const tooltipTitle =
    names.length > 0
      ? names.length > 12
        ? `${names.slice(0, 12).join(', ')} and ${names.length - 12} more`
        : names.join(', ')
      : undefined;

  return (
    <span
      title={tooltipTitle}
      className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-border bg-background px-2.5 py-1 text-sm text-foreground"
    >
      {entity.type === 'group' ? (
        <Users className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      ) : (
        <User className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      )}
      <span className="max-w-[160px] truncate">{entity.label}</span>
      {entity.type === 'group' && (
        <span className="shrink-0 text-muted-foreground">
          · {entity.count - (entity.excludedMemberNames?.length ?? 0)}
        </span>
      )}
      {onRoleChange && (
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onRoleChange(entity.role === 'editor' ? 'viewer' : 'editor')}
          className="flex shrink-0 items-center gap-0.5 rounded-md border border-border bg-muted/60 px-1.5 py-0.5 text-xs text-foreground hover:bg-muted"
        >
          {entity.role === 'editor' ? 'Editor' : 'Viewer'}
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </button>
      )}
      <button
        type="button"
        aria-label={`Remove ${entity.label}`}
        onMouseDown={(e) => e.preventDefault()}
        onClick={onRemove}
        className="ml-0.5 shrink-0 rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function EntitySelector({
  value,
  onChange,
  scopes,
  searchFn,
  multiSelect = true,
  placeholder = 'Search…',
  searchPlaceholder = 'Search…',
  noResultsText = 'No results found',
  emptyTabText = 'No items in this category',
  maxScrollHeight = '240px',
  showRole = false,
}: EntitySelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeScope, setActiveScope] = useState(scopes?.[0]?.id ?? '');
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
  const [groupExclusions, setGroupExclusions] = useState<Map<string, Set<string>>>(new Map());

  const wrapperRef = useRef<HTMLDivElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isMobile = useIsMobile();
  const [dropdownRect, setDropdownRect] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);

  useEffect(() => {
    if (!isOpen || isMobile) {
      setDropdownRect(null);
      return;
    }
    function recalc() {
      if (!wrapperRef.current) return;
      const r = wrapperRef.current.getBoundingClientRect();
      setDropdownRect({ top: r.bottom + 4, left: r.left, width: r.width });
    }
    recalc();
    window.addEventListener('scroll', recalc, true);
    window.addEventListener('resize', recalc);
    return () => {
      window.removeEventListener('scroll', recalc, true);
      window.removeEventListener('resize', recalc);
    };
  }, [isOpen, isMobile]);

  // Derived: IDs of individually-selected entities (for member expansion highlights)
  const selectedIndividualIds = useMemo(
    () => new Set(value.filter((e) => e.type === 'individual').map((e) => e.id)),
    [value],
  );

  useEffect(() => {
    if (scopes && scopes.length > 0 && !scopes.find((s) => s.id === activeScope)) {
      setActiveScope(scopes[0].id);
    }
  }, [scopes, activeScope]);

  // Collapse on query change — the expanded group may disappear from results.
  useEffect(() => {
    setExpandedGroupId(null);
  }, [query]);

  // Outside-click to close (desktop only — Sheet handles its own dismissal)
  // Must also check the portal div since it lives outside wrapperRef in the DOM.
  useEffect(() => {
    if (isMobile) return;
    function handleMouseDown(e: MouseEvent) {
      const target = e.target as Node;
      const inWrapper = wrapperRef.current?.contains(target) ?? false;
      const inPortal = portalRef.current?.contains(target) ?? false;
      if (!inWrapper && !inPortal) {
        setIsOpen(false);
        setQuery('');
      }
    }
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [isMobile]);

  function handleToggle(item: EntityItem) {
    const isSelected = value.some((e) => e.id === item.id);
    if (isSelected) {
      onChange(value.filter((e) => e.id !== item.id));
      if (groupExclusions.has(item.id)) {
        const next = new Map(groupExclusions);
        next.delete(item.id);
        setGroupExclusions(next);
      }
    } else if (multiSelect) {
      onChange([...value, toSelectedEntity(item)]);
    } else {
      onChange([toSelectedEntity(item)]);
      setIsOpen(false);
      setQuery('');
    }
  }

  function handleMemberToggle(groupId: string, memberName: string, totalMembers: number) {
    const currentExcl = groupExclusions.get(groupId) ?? new Set<string>();
    const newExcl = new Set(currentExcl);
    if (newExcl.has(memberName)) newExcl.delete(memberName);
    else newExcl.add(memberName);

    // Deselect the whole group if all members would be excluded
    if (newExcl.size >= totalMembers) {
      onChange(value.filter((e) => e.id !== groupId));
      const next = new Map(groupExclusions);
      next.delete(groupId);
      setGroupExclusions(next);
      return;
    }

    const next = new Map(groupExclusions);
    if (newExcl.size === 0) next.delete(groupId);
    else next.set(groupId, newExcl);
    setGroupExclusions(next);
    const updatedValue = value.map((e) =>
      e.id === groupId
        ? { ...e, excludedMemberNames: newExcl.size > 0 ? [...newExcl] : undefined }
        : e,
    );
    onChange(updatedValue);
  }

  function handleIndividualFromMember(memberId: string, memberLabel: string) {
    const already = value.some((e) => e.id === memberId && e.type === 'individual');
    if (already) {
      onChange(value.filter((e) => !(e.id === memberId && e.type === 'individual')));
    } else {
      onChange([...value, { id: memberId, label: memberLabel, type: 'individual', count: 1 }]);
    }
  }

  function handleRemove(entity: SelectedEntity) {
    onChange(value.filter((e) => e.id !== entity.id));
    if (groupExclusions.has(entity.id)) {
      const next = new Map(groupExclusions);
      next.delete(entity.id);
      setGroupExclusions(next);
    }
  }

  function closePanel() {
    setIsOpen(false);
    setQuery('');
  }

  // When no scopes (staff/search-only mode): always call searchFn so staff panel
  // shows all groups + individuals immediately on open (searchFn('') returns all).
  // When scopes exist: only call searchFn when there's a query; browse tabs handle
  // the empty-query state.
  const searchResults = !scopes || query ? searchFn(query) : { groups: [], individuals: [] };

  function renderSectionHeader(title: string) {
    return <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground">{title}</div>;
  }

  function renderBrowseTab() {
    const scope = scopes?.find((s) => s.id === activeScope);
    if (!scope) return null;

    const renderItems = (items: EntityItem[]) =>
      items.map((item) => (
        <ResultRow
          key={item.id}
          item={item}
          isSelected={value.some((e) => e.id === item.id)}
          onToggle={() => handleToggle(item)}
          isExpanded={expandedGroupId === item.id}
          onToggleExpand={() => setExpandedGroupId((prev) => (prev === item.id ? null : item.id))}
          selectedIndividualIds={selectedIndividualIds}
          excludedMemberNames={groupExclusions.get(item.id)}
          onMemberToggle={(name) =>
            handleMemberToggle(
              item.id,
              name,
              item.memberDetails?.length ?? item.memberNames?.length ?? 0,
            )
          }
          onIndividualSelect={handleIndividualFromMember}
        />
      ));

    const content = scope.sections
      ? scope.sections.map((section) => (
          <div key={section.label}>
            <div className="px-3 py-1.5 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
              {section.label}
            </div>
            {renderItems(section.items)}
          </div>
        ))
      : renderItems(scope.items);

    const createLink = scope.createHref && (
      <Link
        to={scope.createHref}
        className="flex items-center gap-2 px-3 py-2 text-sm text-primary hover:bg-slate-2"
      >
        <Plus className="h-4 w-4" />
        {scope.createLabel ?? 'Create'}
      </Link>
    );

    if (!scope.sections && scope.items.length === 0 && !scope.createHref) {
      return <p className="py-8 text-center text-sm text-muted-foreground">{emptyTabText}</p>;
    }

    return (
      <>
        {content}
        {createLink}
      </>
    );
  }

  function renderSearchResults() {
    const { groups, individuals } = searchResults;
    if (groups.length === 0 && individuals.length === 0) {
      return <p className="py-8 text-center text-sm text-muted-foreground">{noResultsText}</p>;
    }
    return (
      <>
        {groups.length > 0 && (
          <>
            {renderSectionHeader('Groups')}
            {groups.map((item) => (
              <ResultRow
                key={item.id}
                item={item}
                isSelected={value.some((e) => e.id === item.id)}
                onToggle={() => handleToggle(item)}
                isExpanded={expandedGroupId === item.id}
                onToggleExpand={() =>
                  setExpandedGroupId((prev) => (prev === item.id ? null : item.id))
                }
                selectedIndividualIds={selectedIndividualIds}
                excludedMemberNames={groupExclusions.get(item.id)}
                onMemberToggle={(name) =>
                  handleMemberToggle(
                    item.id,
                    name,
                    item.memberDetails?.length ?? item.memberNames?.length ?? 0,
                  )
                }
                onIndividualSelect={handleIndividualFromMember}
              />
            ))}
          </>
        )}
        {groups.length > 0 && individuals.length > 0 && <div className="mx-3 my-0.5 border-t" />}
        {individuals.length > 0 && (
          <>
            {renderSectionHeader('Individuals')}
            {individuals.map((item) => (
              <ResultRow
                key={item.id}
                item={item}
                isSelected={value.some((e) => e.id === item.id)}
                onToggle={() => handleToggle(item)}
                isExpanded={expandedGroupId === item.id}
                onToggleExpand={() =>
                  setExpandedGroupId((prev) => (prev === item.id ? null : item.id))
                }
                selectedIndividualIds={selectedIndividualIds}
                excludedMemberNames={groupExclusions.get(item.id)}
                onMemberToggle={(name) =>
                  handleMemberToggle(
                    item.id,
                    name,
                    item.memberDetails?.length ?? item.memberNames?.length ?? 0,
                  )
                }
                onIndividualSelect={handleIndividualFromMember}
              />
            ))}
          </>
        )}
      </>
    );
  }

  // Scope tab bar — rendered above the field on desktop, inside the Sheet on mobile
  const scopeTabs = scopes && scopes.length > 0 && (
    <div className="scrollbar-none flex gap-1 overflow-x-auto">
      {scopes.map((scope) => (
        <button
          key={scope.id}
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            setActiveScope(scope.id);
            setQuery('');
            if (!isMobile) {
              setIsOpen(true);
              inputRef.current?.focus();
            }
          }}
          className={cn(
            'rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors',
            activeScope === scope.id
              ? 'bg-twblue-2 text-primary'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground',
          )}
        >
          {scope.label}
        </button>
      ))}
    </div>
  );

  // Panel content — shared between desktop dropdown and mobile Sheet
  // (does NOT contain a search input — desktop search is inline in the token
  //  container; mobile Sheet adds its own search input above this)
  const panelBody = (
    <>
      {/* Browse tabs — top of the dropdown panel, visible when scopes exist and not searching */}
      {scopes && scopes.length > 0 && !query && (
        <div className="border-b px-2 py-1.5">{scopeTabs}</div>
      )}

      {/* Results */}
      <div style={{ maxHeight: maxScrollHeight, overflowY: 'auto' }}>
        {!scopes || query ? renderSearchResults() : renderBrowseTab()}
      </div>
    </>
  );

  // Search input — clean standalone field, no chips inside.
  const searchInput = (
    <div
      role="combobox"
      aria-expanded={isOpen}
      aria-haspopup="listbox"
      onClick={() => {
        if (!isMobile) {
          inputRef.current?.focus();
        } else {
          setIsOpen(true);
        }
      }}
      className={cn(
        'flex min-h-9 w-full items-center rounded-[14px] border border-input bg-background px-2.5 py-1.5 transition-colors',
        'cursor-text hover:border-ring',
        isOpen && 'border-ring ring-[3px] ring-ring/50',
      )}
    >
      {/* Desktop: inline search input */}
      {!isMobile && (
        <input
          ref={inputRef}
          type="text"
          value={query}
          placeholder={placeholder}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              if (query) setQuery('');
              else closePanel();
            }
            if (e.key === 'Backspace' && !query && value.length > 0) {
              handleRemove(value[value.length - 1]);
            }
          }}
          className="min-w-[100px] flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      )}

      {/* Mobile: placeholder text + chevron */}
      {isMobile && (
        <>
          <span className="flex-1 text-sm text-muted-foreground">{placeholder}</span>
          <ChevronDown
            className={cn(
              'ml-auto h-4 w-4 shrink-0 text-muted-foreground transition-transform',
              isOpen && 'rotate-180',
            )}
          />
        </>
      )}
    </div>
  );

  // Selected chips row — rendered below the search input.
  const chipRow = value.length > 0 && (
    <div className="flex flex-wrap items-center gap-1.5 pt-1.5">
      {value.map((entity) => (
        <EntityChip
          key={entity.id}
          entity={entity}
          onRemove={() => handleRemove(entity)}
          onRoleChange={
            showRole
              ? (role) => {
                  onChange(value.map((e) => (e.id === entity.id ? { ...e, role } : e)));
                }
              : undefined
          }
        />
      ))}
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => onChange([])}
        className="ml-auto shrink-0 text-xs text-muted-foreground transition-colors hover:text-destructive"
      >
        Clear all
      </button>
    </div>
  );

  return (
    <div ref={wrapperRef} className="relative">
      {searchInput}
      {chipRow}

      {/* Desktop: portal dropdown panel — renders outside card to escape overflow:hidden */}
      {!isMobile &&
        isOpen &&
        dropdownRect &&
        createPortal(
          <div
            ref={portalRef}
            style={{
              position: 'fixed',
              top: dropdownRect.top,
              left: dropdownRect.left,
              width: dropdownRect.width,
              zIndex: 50,
            }}
            className="overflow-hidden rounded-lg border bg-white shadow-md"
          >
            {panelBody}
          </div>,
          document.body,
        )}

      {/* Mobile: bottom Sheet */}
      {isMobile && (
        <Sheet
          open={isOpen}
          onOpenChange={(open) => {
            setIsOpen(open);
            if (!open) setQuery('');
          }}
        >
          <SheetContent side="bottom" className="max-h-[85vh] rounded-t-xl px-0 pt-0">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div className="flex flex-col gap-1">
                <div className="mx-auto h-1 w-12 rounded-full bg-accent" />
              </div>
              <span className="text-sm font-medium text-muted-foreground">{placeholder}</span>
              <button type="button" onClick={closePanel} className="rounded-md p-1 hover:bg-muted">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>

            {/* Search input inside Sheet */}
            <div className="relative border-b">
              <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    if (query) setQuery('');
                    else closePanel();
                  }
                }}
                autoFocus
                className="w-full border-0 bg-transparent py-2.5 pr-8 pl-9 text-sm outline-none placeholder:text-muted-foreground"
              />
              {query && (
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setQuery('')}
                  className="absolute top-1/2 right-3 -translate-y-1/2 rounded p-0.5 hover:bg-muted"
                >
                  <X className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              )}
            </div>

            {/* Panel body (tabs + results) */}
            <div className="overflow-y-auto" style={{ maxHeight: 'calc(85vh - 108px)' }}>
              {panelBody}
            </div>
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}
