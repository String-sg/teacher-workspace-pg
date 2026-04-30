import React from 'react';
import { useLoaderData } from 'react-router';

import { fetchCustomGroups, fetchGroupsAssigned } from '~/api/client';
import type { PGApiCustomGroupSummary, PGApiGroupsAssigned } from '~/api/types';

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
  void data;
  return (
    <div className="px-4 py-6 md:px-6">
      <h1 className="text-2xl font-semibold">Groups</h1>
    </div>
  );
};

export { GroupsView as Component };
