import { Plus } from 'lucide-react';
import React from 'react';
import { Link, useLoaderData } from 'react-router';

import { fetchCustomGroups, fetchGroupsAssigned } from '~/api/client';
import type { PGApiCustomGroupSummary, PGApiGroupsAssigned } from '~/api/types';
import { AssignedGroupsSection } from '~/components/groups/AssignedGroupsSection';
import { CustomGroupsTable } from '~/components/groups/CustomGroupsTable';
import { Button } from '~/components/ui';

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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Groups</h1>
        <Button render={<Link to="/groups/customGroups/new" />} nativeButton={false}>
          <Plus className="size-4" aria-hidden />
          Create custom group
        </Button>
      </div>
      <section className="mt-6">
        <h2 className="text-lg font-semibold">Assigned Groups</h2>
        <div className="mt-3">
          <AssignedGroupsSection assigned={data.assigned} />
        </div>
      </section>
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
