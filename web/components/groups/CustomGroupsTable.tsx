import { Users } from 'lucide-react';
import React from 'react';
import { Link } from 'react-router';

import type { PGApiCustomGroupSummary } from '~/api/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '~/components/ui';
import { formatDate } from '~/helpers/dateTime';

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

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Group name</TableHead>
          <TableHead className="text-right">No. of students</TableHead>
          <TableHead>Created on</TableHead>
          <TableHead>Created by</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {groups.map((g) => (
          <TableRow key={g.customGroupId}>
            <TableCell>
              <Link
                to={`/groups/customGroups/${g.customGroupId}`}
                className="font-medium text-foreground hover:underline"
              >
                {g.name}
              </Link>
            </TableCell>
            <TableCell className="text-right">
              <span className="inline-flex items-center gap-1">
                <Users className="size-4 text-muted-foreground" aria-hidden />
                {g.studentCount}
              </span>
            </TableCell>
            <TableCell>{formatDate(g.createdAt)}</TableCell>
            <TableCell>{g.createdByName}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
