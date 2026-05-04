import { X } from 'lucide-react';
import React from 'react';
import { Link, useLoaderData } from 'react-router';

import { fetchSchoolClasses, fetchSchoolStudents } from '~/api/client';
import type { PGApiSchoolClass, PGApiSchoolStudent } from '~/api/types';

interface AddStudentsLoaderData {
  students: PGApiSchoolStudent[];
  classes: PGApiSchoolClass[];
}

export async function loader(): Promise<AddStudentsLoaderData> {
  const [students, classes] = await Promise.all([fetchSchoolStudents(), fetchSchoolClasses()]);
  return { students, classes };
}

const AddStudentsView: React.FC = () => {
  const data = useLoaderData() as AddStudentsLoaderData;
  void data;
  return (
    <div className="flex justify-center px-6 py-6">
      <div className="w-full max-w-4xl">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Add students</h1>
          <Link
            to="/groups/customGroups/new"
            aria-label="Close"
            className="rounded-md p-2 text-muted-foreground hover:bg-muted"
          >
            <X className="size-5" aria-hidden />
          </Link>
        </header>
      </div>
    </div>
  );
};

export { AddStudentsView as Component };
