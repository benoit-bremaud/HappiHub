import { useState } from 'react';
import { Link } from 'react-router-dom';
import { send } from './request';

/** Pending invitations for the signed-in address; joining stays an explicit choice (UC11 4c). */
export const JoinList = ({ invitations = [] }) => {
  const [joined, setJoined] = useState({});
  if (!invitations.length) return null;
  const join = async (id) => {
    const { ok, data } = await send('/invitations/accept', 'POST', { invitationId: id });
    setJoined((current) => ({ ...current, [id]: ok ? 'joined' : data.message ?? 'Unable to join.' }));
  };
  return (
    <>
      <h3>Invitations waiting for you</h3>
      <ul className="hh-list">
        {invitations.map((invitation) => (
          <li key={invitation.id}>
            <span>{invitation.associationName}</span>
            {joined[invitation.id] === 'joined'
              ? <Link to={`/associations/${invitation.associationSlug}`}>Open the association</Link>
              : <button className="hh-button" onClick={() => join(invitation.id)}>Join</button>}
            {joined[invitation.id] && joined[invitation.id] !== 'joined' && <span role="alert">{joined[invitation.id]}</span>}
          </li>
        ))}
      </ul>
    </>
  );
};
