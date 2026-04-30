import React, { useState } from 'react';

import { Input } from '~/components/ui';

const TITLE_MAX = 120;

const CreateCustomGroupView: React.FC = () => {
  const [title, setTitle] = useState('');

  return (
    <div className="px-4 py-6 md:px-6">
      <h1 className="text-2xl font-semibold">Create new group</h1>
      <div className="mt-6 max-w-2xl">
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
      </div>
    </div>
  );
};

export { CreateCustomGroupView as Component };
