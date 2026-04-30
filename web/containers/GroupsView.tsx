import React from 'react';
import { useLoaderData } from 'react-router';

import { fetchCustomGroups, fetchGroupsAssigned } from '~/api/client';
import type { PGApiCustomGroupSummary, PGApiGroupsAssigned } from '~/api/types';
import { CustomGroupsTable } from '~/components/groups/CustomGroupsTable';

interface GroupsLoaderData {
  customGroups: PGApiCustomGroupSummary[];
  assigned: PGApiGroupsAssigned;
}

export async function loader(): Promise<GroupsLoaderData> {
  const [customList, assigned] = await Promise.all([fetchCustomGroups(), fetchGroupsAssigned()]);
  return { customGroups: customList.customGroups, assigned };
}

const GroupsView: React.FC = () => {
  const data = useLoaderData() as GroupsLoaderData;
  return (
    <div className="px-4 py-6 md:px-6">
      <h1 className="text-2xl font-semibold">Groups</h1>
      <section className="mt-8">
        <h2 className="text-lg font-semibold">
          Custom Groups{' '}
          <span className="text-sm font-normal text-muted-foreground">
            ({data.customGroups.length} created)
          </span>
        </h2>
        <div className="mt-3">
          <CustomGroupsTable groups={data.customGroups} />
        </div>
      </section>
    </div>
  );
};

export { GroupsView as Component };
