import PropTypes from 'prop-types';
import { useEffect, useId, useRef } from 'react';
import './confirm-dialog.css';

/**
 * Modal confirmation (spec modal-confirmation-dialog, R1–R5): nothing happens until the member confirms.
 * The native dialog makes the page inert; Esc maps to onClose and focus returns to the trigger.
 */
export const ConfirmDialog = ({ title, children, confirmLabel, onConfirm, onClose, busy = false, danger = true, closeLabel = 'Go back' }) => {
  const titleId = useId();
  const bodyId = useId();
  const dialogRef = useRef(null);
  const confirmRef = useRef(null);
  const closeRef = useRef(null);

  // Mount-only on purpose: opening, initial focus and focus return happen once per dialog.
  useEffect(() => {
    const dialog = dialogRef.current;
    const trigger = document.activeElement;
    dialog.showModal();
    // R2: React autoFocus would run before showModal, so the initial focus is set here.
    (danger ? closeRef : confirmRef).current.focus();
    return () => {
      if (dialog.open) dialog.close();
      if (trigger?.isConnected) trigger.focus();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // R3: React state stays the source of truth, so the native close is prevented.
  const cancel = (event) => { event.preventDefault(); if (!busy) onClose(); };
  // R3: if the browser closes the dialog anyway (repeated Esc), resync instead of hiding it.
  // The cleanup's own close() (unmount, StrictMode remount) finds no dialog or an open one, and is ignored.
  const closed = () => {
    const dialog = dialogRef.current;
    if (!dialog || dialog.open) return;
    if (busy) dialog.showModal(); else onClose();
  };

  return (
    <dialog ref={dialogRef} className="hh-dialog" aria-labelledby={titleId} aria-describedby={children ? bodyId : undefined}
      onCancel={cancel} onClose={closed}>
      <h3 id={titleId}>{title}</h3>
      {children && <div id={bodyId}>{children}</div>}
      <div className="hh-dialog-actions">
        <button ref={confirmRef} type="button" className={`hh-button${danger ? ' hh-danger' : ''}`} disabled={busy} onClick={onConfirm}>{confirmLabel}</button>
        <button ref={closeRef} type="button" className="hh-button hh-secondary" disabled={busy} onClick={onClose}>{closeLabel}</button>
      </div>
    </dialog>
  );
};
ConfirmDialog.propTypes = { title: PropTypes.string.isRequired, children: PropTypes.node, confirmLabel: PropTypes.string.isRequired, onConfirm: PropTypes.func.isRequired, onClose: PropTypes.func.isRequired, busy: PropTypes.bool, danger: PropTypes.bool, closeLabel: PropTypes.string };
