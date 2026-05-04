import { Plus } from 'lucide-react';
import React, { useState } from 'react';
import { Link } from 'react-router';

import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Input,
} from '~/components/ui';

const TITLE_MAX = 120;

const CreateCustomGroupView: React.FC = () => {
  const [title, setTitle] = useState('');

  return (
    <div className="flex justify-center px-6 py-6">
      <div className="w-full max-w-2xl">
        <h1 className="text-2xl font-semibold">Create new group</h1>
        <div className="mt-6">
          <label htmlFor="group-title" className="text-sm font-medium">
            Title<span className="text-destructive">*</span>
          </label>
          <Input
            id="group-title"
            value={title}
            maxLength={TITLE_MAX}
            onChange={(e) => setTitle(e.target.value.slice(0, TITLE_MAX))}
            placeholder="What would you like to call your group?"
            className="mt-1"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            {TITLE_MAX - title.length} characters left
          </p>

          <div className="mt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">0 students added.</p>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    <Plus className="size-4" aria-hidden />
                    Add Students
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem disabled>Add manually</DropdownMenuItem>
                  <DropdownMenuItem disabled>Upload via Excel</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="mt-2 rounded-md bg-muted p-6 text-center text-sm text-muted-foreground">
              No students added yet.
            </div>
          </div>

          <div className="mt-8 flex items-center justify-end gap-3">
            <Link
              to="/groups"
              className="text-sm font-medium text-muted-foreground hover:underline"
            >
              Cancel
            </Link>
            <Button disabled title="Add at least one student to create the group">
              Create Now
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export { CreateCustomGroupView as Component };
