import PropTypes from 'prop-types';
import { useId } from 'react';

/** In-page confirmation (UC19 2, UC20 2): nothing happens until the member confirms. */
export const ConfirmDialog = ({ title, children, confirmLabel, onConfirm, onClose, busy = false, danger = true, closeLabel = 'Keep the event' }) => {
  const titleId = useId();
  return (
    <dialog open className="hh-dialog" aria-labelledby={titleId}>
      <h3 id={titleId}>{title}</h3>
      {children}
      <div className="hh-actions">
        <button type="button" className={`hh-button${danger ? ' hh-danger' : ''}`} disabled={busy} onClick={onConfirm}>{confirmLabel}</button>
        <button type="button" className="hh-button hh-secondary" onClick={onClose}>{closeLabel}</button>
      </div>
    </dialog>
  );
};
ConfirmDialog.propTypes = { title: PropTypes.string.isRequired, children: PropTypes.node, confirmLabel: PropTypes.string.isRequired, onConfirm: PropTypes.func.isRequired, onClose: PropTypes.func.isRequired, busy: PropTypes.bool, danger: PropTypes.bool, closeLabel: PropTypes.string };
