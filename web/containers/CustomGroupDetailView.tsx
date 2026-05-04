import React from 'react';
import { useLoaderData } from 'react-router';

import { fetchCustomGroupDetail } from '~/api/client';
import type { PGApiCustomGroupDetail } from '~/api/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui';

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
            {/* Task 4 */}
          </TabsContent>
          <TabsContent value="details" className="mt-4">
            {/* Task 5 */}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export { CustomGroupDetailView as Component };
