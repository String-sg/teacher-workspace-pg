import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { DeleteGroupModal } from './DeleteGroupModal';

function renderModal(onDelete = vi.fn().mockResolvedValue(undefined)) {
  const onClose = vi.fn();
  render(
    <DeleteGroupModal
      open={true}
      onClose={onClose}
      groupName="Olympiad Study Group"
      onDelete={onDelete}
    />,
  );
  return { onDelete, onClose };
}

describe('DeleteGroupModal', () => {
  it('renders the dialog title and group name', () => {
    renderModal();
    expect(screen.getByRole('heading', { name: 'Delete custom group?' })).toBeInTheDocument();
    expect(screen.getByText(/Olympiad Study Group/)).toBeInTheDocument();
  });

  it('renders the acknowledgement checkbox unchecked by default', () => {
    renderModal();
    expect(screen.getByRole('checkbox')).not.toBeChecked();
  });

  it('renders the Delete button disabled until checkbox is ticked', () => {
    renderModal();
    const deleteBtn = screen.getByRole('button', { name: /delete/i });
    expect(deleteBtn).toBeDisabled();

    fireEvent.click(screen.getByRole('checkbox'));
    expect(deleteBtn).toBeEnabled();
  });

  it('calls onDelete when checkbox is ticked and Delete is clicked', async () => {
    const { onDelete } = renderModal();
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: /delete/i }));
    expect(onDelete).toHaveBeenCalledOnce();
  });
});
