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

  test('the close button is disabled while the action is running', () => {
    render(<Harness busy />);
    openFromTrigger();
    expect(screen.getByRole('button', { name: 'Go back' })).toBeDisabled();
  });

  test('a native close while running reopens the dialog', () => {
    render(<Harness busy />);
    openFromTrigger();
    const dialog = screen.getByRole('dialog');
    const showModal = jest.spyOn(dialog, 'showModal');
    dialog.removeAttribute('open');
    fireEvent(dialog, new Event('close'));
    expect(showModal).toHaveBeenCalledTimes(1);
    expect(dialog).toHaveAttribute('open');
  });

  test('a native close when idle closes through onClose', () => {
    render(<Harness />);
    const trigger = openFromTrigger();
    const dialog = screen.getByRole('dialog');
    dialog.removeAttribute('open');
    fireEvent(dialog, new Event('close'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  test('without a body there is no empty description', () => {
    render(<ConfirmDialog title="Leave?" confirmLabel="Leave" onConfirm={() => {}} onClose={() => {}} />);
    expect(screen.getByRole('dialog', { name: 'Leave?' })).not.toHaveAttribute('aria-describedby');
  });

  test('unmounting when the trigger was removed does not throw and leaves no dialog', () => {
    const { rerender } = render(<><button type="button">Open</button></>);
    const trigger = screen.getByRole('button', { name: 'Open' });
    trigger.focus();
    rerender(<ConfirmDialog title="T" confirmLabel="OK" onConfirm={() => {}} onClose={() => {}} />);
    expect(trigger.isConnected).toBe(false);
    rerender(<></>);
    expect(document.activeElement).not.toBe(trigger);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
