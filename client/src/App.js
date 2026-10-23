import './App.css';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { SessionProvider, useSession } from './session';
import { Header } from './components/Header/Header';
import { Home } from './components/Home/Home';
import { ForgotPassword, ResetPassword, SignIn, SignUp, VerifyEmail } from './accounts/AuthPages';
import { AccountPage } from './accounts/AccountPage';
import { AssociationPage } from './accounts/AssociationPage';
import { InvitationPage } from './accounts/InvitationPage';
import { EventEditorPage } from './events/EventEditorPage';
import { EventListPage } from './events/EventListPage';
import { PublicEventPage } from './events/PublicEventPage';

function AppContent() {
  const { account, status, refresh } = useSession();
  return (
    <div className="App">
      <Router>
        <Header />
        {status === 'loading' && <p role="status">Checking your session…</p>}
        {status === 'unavailable' && <div role="alert">Authentication unavailable. <button onClick={refresh}>Retry connection</button></div>}
        <main className="content">
          <Routes>
            <Route path="/" element={<Home account={account} />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/signin" element={<SignIn />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/account" element={<AccountPage />} />
            <Route path="/associations/:slug" element={<AssociationPage />} />
            <Route path="/invitations" element={<InvitationPage />} />
            <Route path="/associations/:slug/events" element={<EventListPage />} />
            <Route path="/associations/:slug/events/new" element={<EventEditorPage />} />
            <Route path="/associations/:slug/events/:id" element={<EventEditorPage />} />
            <Route path="/events/:id" element={<PublicEventPage />} />
          </Routes>
        </main>
      </Router>
    </div>
  );
}

export const App = () => <SessionProvider><AppContent /></SessionProvider>;
