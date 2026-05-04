import React from 'react';
import { Link, useLoaderData } from 'react-router';

import { fetchCustomGroupDetail } from '~/api/client';
import type { PGApiCustomGroupDetail } from '~/api/types';
import { StudentsByClassList } from '~/components/groups/StudentsByClassList';
import { Button, Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui';
import { formatDate } from '~/helpers/dateTime';

export async function loader({
  params,
}: {
  params: { id?: string };
}): Promise<PGApiCustomGroupDetail> {
  const id = Number(params.id);
  if (!Number.isFinite(id)) throw new Response('Invalid group id', { status: 400 });
  return fetchCustomGroupDetail(id);
}

const CustomGroupDetailView: React.FC = () => {
  const data = useLoaderData() as PGApiCustomGroupDetail;

  return (
    <div className="flex justify-center px-6 py-6">
      <div className="w-full max-w-4xl">
        <header>
          <p className="text-xs tracking-wide text-muted-foreground uppercase">Custom Group</p>
          <h1 className="mt-1 text-2xl font-semibold">{data.name}</h1>
        </header>

        <Tabs defaultValue="students" className="mt-6">
          <TabsList>
            <TabsTrigger value="students">Students ({data.students.length})</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
          </TabsList>
          <TabsContent value="students" className="mt-4">
            <StudentsByClassList students={data.students} />
          </TabsContent>
          <TabsContent value="details" className="mt-4 space-y-6">
            <p className="text-sm text-muted-foreground">
              Created on {formatDate(data.createdAt)} by {data.createdByName}.
            </p>
            {data.sharedWith.length > 0 ? (
              <div className="text-sm">
                <span className="font-medium">Group shared with:</span>{' '}
                {data.sharedWith.map((s) => s.staffName).join(', ')}
              </div>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-3">
              <article className="rounded-md border p-4">
                <h3 className="font-semibold">Edit this custom group</h3>
                <Button asChild variant="outline" className="mt-3">
                  <Link to={`/groups/customGroups/${data.customGroupId}/edit`}>Edit Group</Link>
                </Button>
              </article>
              <article className="rounded-md border p-4">
                <h3 className="font-semibold">Share this custom group</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  You will be granting access to edit this group. Please be certain.
                </p>
                <Button variant="outline" className="mt-3" disabled>
                  Share Group
                </Button>
              </article>
              <article className="rounded-md border p-4">
                <h3 className="font-semibold">Delete this custom group</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Once you delete this custom group, you can never get it back again.
                </p>
                <Button variant="outline" className="mt-3" disabled>
                  Delete Forever
                </Button>
              </article>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export { CustomGroupDetailView as Component };
