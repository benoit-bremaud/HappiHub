import { apiFetch } from '../../api';
import './event.css';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Card from '../Card/Card';
import { useSession } from '../../session';
import { Comment } from '../Comment/Comment';
/** Render a permitted event and its comments. */
export const EventInfo = () => {
  const { id } = useParams();
  const { user: session, status } = useSession();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    if (status === 'loading') return;
    const controller = new AbortController();
    setData(null); setError(''); setLoading(true);
    const load = async () => {
      try {
        const response = await apiFetch(`/events/${id}`, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error('Request failed');
        const result = await response.json();
        if (!controller.signal.aborted) setData(result);
      } catch {
        if (!controller.signal.aborted) setError('Unable to load this event. Please try again.');
      } finally { if (!controller.signal.aborted) setLoading(false); }
    };
    load(); return () => controller.abort();
  }, [id, session, status]);
  return <div className="event-container">
    {loading && <p role="status">Loading…</p>}
    {error && <p role="alert">{error}</p>}
    {data && <><Card event={data} /><Comment /></>}
  </div>;
};
