export type PostKind = 'post' | 'post-with-response';

interface PostTypePickerProps {
  onSelect: (type: PostKind) => void;
}

function PostTypePicker({ onSelect }: PostTypePickerProps) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center">
      <h1 className="text-2xl font-semibold tracking-tight">What would you like to create?</h1>
      <p className="mt-1 text-sm text-muted-foreground">Choose a type to get started.</p>

      <div className="mt-8 grid max-w-2xl grid-cols-1 gap-4 sm:grid-cols-2">
        <button
          type="button"
          className="cursor-pointer rounded-xl border p-6 text-left focus-standard transition-colors hover:border-primary hover:bg-primary/5"
          onClick={() => onSelect('post')}
        >
          <div className="rounded-lg bg-muted/60 p-4">
            <div className="space-y-2">
              <div className="h-2.5 w-3/5 rounded-full bg-foreground/15" />
              <div className="h-2.5 w-full rounded-full bg-foreground/15" />
              <div className="h-2.5 w-4/6 rounded-full bg-foreground/15" />
              <div className="h-2.5 w-3/5 rounded-full bg-foreground/15" />
              <div className="h-2.5 w-full rounded-full bg-foreground/15" />
            </div>
          </div>

          <p className="mt-4 font-medium">View only</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Parents receive and read your post on Parents Gateway.
          </p>
        </button>

        <button
          type="button"
          className="cursor-pointer rounded-xl border p-6 text-left focus-standard transition-colors hover:border-primary hover:bg-primary/5"
          onClick={() => onSelect('post-with-response')}
        >
          <div className="rounded-lg bg-muted/60 p-4">
            <div className="space-y-2">
              <div className="h-2.5 w-3/5 rounded-full bg-foreground/15" />
              <div className="h-2.5 w-full rounded-full bg-foreground/15" />
              <div className="h-2.5 w-4/6 rounded-full bg-foreground/15" />
            </div>
            <div className="mt-3 flex w-full items-center justify-center rounded-md bg-primary/70 py-2">
              <div className="h-2 w-16 rounded-full bg-white/40" />
            </div>
          </div>

          <p className="mt-4 font-medium">With responses</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Parents receive your post and submit a response on Parents Gateway.
          </p>
        </button>
      </div>
    </div>
  );
}

export { PostTypePicker };
export type { PostTypePickerProps };
