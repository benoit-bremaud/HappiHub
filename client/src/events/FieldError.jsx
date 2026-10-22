/** Inline refusal of one field (UC15 3a, 5a), local rule or server answer. */
export const FieldError = ({ problem, fields }) => (problem && fields.includes(problem.field)
  ? <span className="hh-error" role="alert">{problem.text}</span> : null);
