import React from 'react';

import type { PGApiCustomGroupSummary } from '~/api/types';

interface CustomGroupsTableProps {
  groups: PGApiCustomGroupSummary[];
}

export const CustomGroupsTable: React.FC<CustomGroupsTableProps> = ({ groups }) => {
  if (groups.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        No custom groups yet.
      </div>
    );
  }
  return null;
};
