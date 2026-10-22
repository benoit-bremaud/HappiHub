import { useId } from 'react';

/** In-page confirmation (UC19 2, UC20 2): nothing happens until the member confirms. */
export const ConfirmDialog = ({ title, children, confirmLabel, onConfirm, onClose, busy = false, danger = true, closeLabel = 'Keep the event' }) => {
  const titleId = useId();
  return (
    <div className="hh-dialog" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <h3 id={titleId}>{title}</h3>
      {children}
      <div className="hh-actions">
        <button type="button" className={`hh-button${danger ? ' hh-danger' : ''}`} disabled={busy} onClick={onConfirm}>{confirmLabel}</button>
        <button type="button" className="hh-button hh-secondary" onClick={onClose}>{closeLabel}</button>
      </div>
    </div>
  );
};
