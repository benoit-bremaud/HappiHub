import PropTypes from 'prop-types';

// Runtime prop contracts of the event components; the editor shape is what useEventEditor returns.

export const valuesShape = PropTypes.objectOf(PropTypes.oneOfType([PropTypes.string, PropTypes.number]));

export const problemShape = PropTypes.shape({ field: PropTypes.string.isRequired, text: PropTypes.string });

export const editorShape = PropTypes.shape({
  status: PropTypes.string.isRequired,
  event: PropTypes.shape({ id: PropTypes.string, status: PropTypes.string, version: PropTypes.number, ended: PropTypes.bool }),
  values: valuesShape.isRequired,
  problem: problemShape,
  message: PropTypes.string,
  pending: PropTypes.bool,
  change: PropTypes.func.isRequired,
  save: PropTypes.func.isRequired,
  lifecycle: PropTypes.func,
});
