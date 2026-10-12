import { apiFetch } from '../../api';
import './comment.css';
import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { decodeSession } from '../../session';

/** View permitted comments anonymously; posting requires a current organizer session. */
export const Comment = () => {
  const { id } = useParams();
  const token = localStorage.getItem('token');
  const session = decodeSession(token);
  const [comments, setComments] = useState([]);
  const [content, setContent] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setComments([]); setLoading(true); setError('');
    const load = async () => {
      try {
        const response = await apiFetch(`/comments/events/${id}/comments`, {
          signal: controller.signal, headers: decodeSession(token) ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!response.ok) throw new Error('Request failed');
        const result = await response.json();
        if (!Array.isArray(result)) throw new Error('Invalid response');
        if (!controller.signal.aborted) setComments(result);
      } catch {
        if (!controller.signal.aborted) setError('Unable to load comments. Please try again.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    load();
    return () => controller.abort();
  }, [id, token]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (saving) return;
    if (!decodeSession(token)) { setError('Please sign in before posting.'); return; }
    setSaving(true); setError('');
    try {
      const response = await apiFetch('/comments/add', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content, event_id: id }),
      });
      if (!response.ok) throw new Error('Request failed');
      const comment = await response.json();
      setComments((previous) => [...previous, comment]);
      setContent('');
    } catch {
      setError('Unable to post your comment. Your text has been kept. Please try again.');
    } finally { setSaving(false); }
  };

  return <section className="comments-div">
    <h2 className="comments-title">Comments</h2>
    {error && <p role="alert">{error}</p>}
    {loading && <p role="status">Loading comments…</p>}
    {session ? <form onSubmit={handleSubmit} className="commentsAddForm">
      <label htmlFor="comment-content">Your comment</label>
      <input id="comment-content" value={content} onChange={(event) => setContent(event.target.value)} required maxLength={5000} />
      <button type="submit" disabled={saving}>{saving ? 'Posting…' : 'Submit'}</button>
    </form> : <p><Link to="/login">Sign in to post a comment</Link></p>}
    <div className="comments-view">{comments.map((comment) => <article className="commentaire" key={comment._id}>
      <strong>Community comment</strong><p>{comment.content}</p>
    </article>)}</div>
  </section>;
};
