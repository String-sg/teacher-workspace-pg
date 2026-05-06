import { ArrowLeft } from 'lucide-react';
import React, { useState } from 'react';
import { Link, useLoaderData, useNavigate, useRevalidator } from 'react-router';

import {
  deleteCustomGroup,
  fetchCustomGroupDetail,
  fetchSchoolStaff,
  removeAccessFromCustomGroup,
  shareCustomGroup,
} from '~/api/client';
import type { PGApiCustomGroupDetail, PGApiSchoolStaff } from '~/api/types';
import { DeleteGroupModal } from '~/components/groups/DeleteGroupModal';
import { ShareGroupModal } from '~/components/groups/ShareGroupModal';
import { StudentsByClassList } from '~/components/groups/StudentsByClassList';
import { Button, Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui';
import { formatDate } from '~/helpers/dateTime';
import { notify } from '~/lib/notify';

interface LoaderData {
  detail: PGApiCustomGroupDetail;
  staff: PGApiSchoolStaff[];
}

export async function loader({ params }: { params: { id?: string } }): Promise<LoaderData> {
  const id = Number(params.id);
  if (!Number.isFinite(id)) throw new Response('Invalid group id', { status: 400 });
  const [detail, staff] = await Promise.all([fetchCustomGroupDetail(id), fetchSchoolStaff()]);
  return { detail, staff };
}

const CustomGroupDetailView: React.FC = () => {
  const { detail: data, staff } = useLoaderData() as LoaderData;
  const navigate = useNavigate();
  const revalidator = useRevalidator();
  const [shareOpen, setShareOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  async function handleDelete() {
    await deleteCustomGroup(data.customGroupId);
    notify.success('Custom group deleted.');
    navigate('/groups');
  }

  async function handleShare(staffIds: number[]) {
    await shareCustomGroup(data.customGroupId, staffIds);
    try {
      revalidator.revalidate();
    } catch {
      notify.error('Shared successfully, but could not refresh the page. Please reload.');
    }
  }

  async function handleRemoveAccess() {
    await removeAccessFromCustomGroup(data.customGroupId);
    notify.success('Access removed.');
    navigate('/groups');
  }

  return (
    <div className="flex justify-center px-6 py-6">
      <div className="w-full max-w-4xl">
        <header className="flex items-start gap-3">
          <Button
            variant="ghost"
            size="icon-sm"
            render={<Link to="/groups" />}
            nativeButton={false}
            aria-label="Back to Groups"
            className="mt-1"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <p className="text-xs tracking-wide text-muted-foreground uppercase">Custom Group</p>
            <h1 className="mt-1 text-2xl font-semibold">{data.name}</h1>
          </div>
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
                <Button
                  variant="secondary"
                  className="mt-3"
                  render={<Link to={`/groups/customGroups/${data.customGroupId}/edit`} />}
                  nativeButton={false}
                >
                  Edit Group
                </Button>
              </article>
              <article className="rounded-md border p-4">
                <h3 className="font-semibold">Share this custom group</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  You will be granting access to edit this group. Please be certain.
                </p>
                <Button variant="secondary" className="mt-3" onClick={() => setShareOpen(true)}>
                  Share Group
                </Button>
              </article>
              {data.sharedWith.length === 0 ? (
                <article className="rounded-md border p-4">
                  <h3 className="font-semibold">Delete this custom group</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Once you delete this custom group, you can never get it back again.
                  </p>
                  <Button variant="secondary" className="mt-3" onClick={() => setDeleteOpen(true)}>
                    Delete Forever
                  </Button>
                </article>
              ) : (
                <article className="rounded-md border p-4">
                  <h3 className="font-semibold">Remove access to this group</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    You will lose access to this shared group. Other staff will still retain access.
                  </p>
                  <Button variant="secondary" className="mt-3" onClick={handleRemoveAccess}>
                    Remove Access
                  </Button>
                </article>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <DeleteGroupModal
          open={deleteOpen}
          onClose={() => setDeleteOpen(false)}
          groupName={data.name}
          onDelete={handleDelete}
        />

        <ShareGroupModal
          open={shareOpen}
          onClose={() => setShareOpen(false)}
          staff={staff}
          creatorStaffId={data.createdBy}
          alreadySharedStaffIds={data.sharedWith.map((s) => s.staffId)}
          onShare={handleShare}
        />
      </div>
    </div>
  );
};

export { CustomGroupDetailView as Component };
