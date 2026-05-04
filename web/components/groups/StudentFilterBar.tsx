import React from 'react';

import { Input } from '~/components/ui';

interface ClassOption {
  label: string;
  value: number;
}

interface StudentFilterBarProps {
  query: string;
  onQueryChange: (q: string) => void;
  levelOptions: string[];
  level: string;
  onLevelChange: (level: string) => void;
  classOptions: ClassOption[];
  classId: string;
  onClassChange: (classId: string) => void;
}

export const StudentFilterBar: React.FC<StudentFilterBarProps> = ({
  query,
  onQueryChange,
  levelOptions,
  level,
  onLevelChange,
  classOptions,
  classId,
  onClassChange,
}) => {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <Input
        placeholder="Search student name or class name"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        className="sm:col-span-2"
      />
      <label className="flex flex-col gap-1 text-xs font-medium">
        Level
        <select
          aria-label="Level"
          value={level}
          onChange={(e) => onLevelChange(e.target.value)}
          className="rounded-md border border-input bg-background px-2 py-1.5 text-sm"
        >
          <option value="">All levels</option>
          {levelOptions.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium">
        Form Class
        <select
          aria-label="Form Class"
          value={classId}
          onChange={(e) => onClassChange(e.target.value)}
          className="rounded-md border border-input bg-background px-2 py-1.5 text-sm"
        >
          <option value="">All classes</option>
          {classOptions.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
};
