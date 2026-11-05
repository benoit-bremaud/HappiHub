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
  const ref = useRef(null);
  const busyRef = useRef(busy);
  busyRef.current = busy;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Mount-only on purpose: the latest busy and onClose are read through refs.
  useEffect(() => {
    const dialog = ref.current;
    const trigger = document.activeElement;
    // R3: React state stays the source of truth, so the native close is prevented.
    const cancel = (event) => { event.preventDefault(); if (!busyRef.current) onCloseRef.current(); };
    dialog.addEventListener('cancel', cancel);
    dialog.showModal();
    // R2: React autoFocus would run before showModal, so the initial focus is set here.
    dialog.querySelector('[data-initial-focus]')?.focus();
    return () => {
      dialog.removeEventListener('cancel', cancel);
      if (dialog.open) dialog.close();
      if (trigger?.isConnected) trigger.focus();
    };
  }, []);

  return (
    <dialog ref={ref} className="hh-dialog" aria-labelledby={titleId} aria-describedby={bodyId}>
      <h3 id={titleId}>{title}</h3>
      <div id={bodyId}>{children}</div>
      <div className="hh-dialog-actions">
        <button type="button" className={`hh-button${danger ? ' hh-danger' : ''}`} disabled={busy} onClick={onConfirm} data-initial-focus={danger ? undefined : ''}>{confirmLabel}</button>
        <button type="button" className="hh-button hh-secondary" onClick={onClose} data-initial-focus={danger ? '' : undefined}>{closeLabel}</button>
      </div>
    </dialog>
  );
};
ConfirmDialog.propTypes = { title: PropTypes.string.isRequired, children: PropTypes.node, confirmLabel: PropTypes.string.isRequired, onConfirm: PropTypes.func.isRequired, onClose: PropTypes.func.isRequired, busy: PropTypes.bool, danger: PropTypes.bool, closeLabel: PropTypes.string };
