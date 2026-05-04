import React from 'react';

import type { PGApiGroupsAssigned } from '~/api/types';

interface AssignedGroupsSectionProps {
  assigned: PGApiGroupsAssigned;
}

export const AssignedGroupsSection: React.FC<AssignedGroupsSectionProps> = ({ assigned }) => {
  const isEmpty = assigned.classes.length === 0 && assigned.ccaGroups.length === 0;

  if (isEmpty) {
    return (
      <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        No assigned groups.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {assigned.classes.map((c) => (
        <article key={`class-${c.classId}`} className="rounded-md border border-border bg-card p-4">
          <h3 className="font-medium">{c.className}</h3>
          <p className="text-xs text-muted-foreground">Form Class</p>
        </article>
      ))}
      {assigned.ccaGroups.map((g) => (
        <article key={`cca-${g.ccaId}`} className="rounded-md border border-border bg-card p-4">
          <h3 className="font-medium">{g.ccaDescription || 'Untitled CCA'}</h3>
          <p className="text-xs text-muted-foreground">CCA</p>
        </article>
      ))}
    </div>
  );
};
