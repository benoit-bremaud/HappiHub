import { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConfirmDialog } from './ConfirmDialog';

// Acceptance criteria AC346-1…5 of spec modal-confirmation-dialog.
const Harness = ({ danger = true, busy = false, onConfirm = () => {} }) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>Open</button>
      {open && (
        <ConfirmDialog title="Delete this draft?" confirmLabel="Delete" danger={danger} busy={busy}
          onConfirm={onConfirm} onClose={() => setOpen(false)}>
          <p>The draft is removed permanently.</p>
        </ConfirmDialog>
      )}
    </>
  );
};

const openFromTrigger = () => {
  const trigger = screen.getByRole('button', { name: 'Open' });
  trigger.focus();
  fireEvent.click(trigger);
  return trigger;
};
const pressEsc = (dialog) => {
  const cancel = new Event('cancel', { cancelable: true });
  fireEvent(dialog, cancel);
  return cancel;
};

describe('ConfirmDialog (#346)', () => {
  test('opens as a modal with an accessible name and description', () => {
    const showModal = jest.spyOn(HTMLDialogElement.prototype, 'showModal');
    render(<Harness />);
    openFromTrigger();
    const dialog = screen.getByRole('dialog', { name: 'Delete this draft?' });
    expect(showModal).toHaveBeenCalledTimes(1);
    expect(dialog).toHaveAttribute('open');
    expect(dialog).toHaveAccessibleDescription('The draft is removed permanently.');
    showModal.mockRestore();
  });

  test('a destructive dialog focuses the safe button first', () => {
    render(<Harness />);
    openFromTrigger();
    expect(screen.getByRole('button', { name: 'Go back' })).toHaveFocus();
  });

  test('a non-destructive dialog focuses the confirm button first', () => {
    render(<Harness danger={false} />);
    openFromTrigger();
    expect(screen.getByRole('button', { name: 'Delete' })).toHaveFocus();
  });

  test('Esc closes without confirming and focus returns to the trigger', () => {
    const onConfirm = jest.fn();
    render(<Harness onConfirm={onConfirm} />);
    const trigger = openFromTrigger();
    const cancel = pressEsc(screen.getByRole('dialog'));
    expect(cancel.defaultPrevented).toBe(true);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(onConfirm).not.toHaveBeenCalled();
    expect(trigger).toHaveFocus();
  });

  test('the close button also returns focus to the trigger', () => {
    render(<Harness />);
    const trigger = openFromTrigger();
    fireEvent.click(screen.getByRole('button', { name: 'Go back' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  test('Esc is ignored while the action is running', () => {
    render(<Harness busy />);
    openFromTrigger();
    pressEsc(screen.getByRole('dialog'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeDisabled();
  });

  test('confirming calls onConfirm', () => {
    const onConfirm = jest.fn();
    render(<Harness onConfirm={onConfirm} />);
    openFromTrigger();
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  test('unmounting after the trigger disappeared does not throw', () => {
    const { rerender, unmount } = render(<ConfirmDialog title="T" confirmLabel="OK" onConfirm={() => {}} onClose={() => {}} />);
    rerender(<ConfirmDialog title="T" confirmLabel="OK" onConfirm={() => {}} onClose={() => {}} />);
    expect(() => unmount()).not.toThrow();
  });
});
