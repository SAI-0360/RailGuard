import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

/** Demo accounts surfaced for the hackathon demo. Click to fill. */
const DEMO_ACCOUNTS = [
  { badge: 'DEN', email: 'den@railguard.in', password: 'den123' },
  { badge: 'SSE', email: 'sse@railguard.in', password: 'sse123' },
  { badge: 'JE', email: 'je1@railguard.in', password: 'je1123' },
  { badge: 'JE', email: 'je2@railguard.in', password: 'je2123' },
  { badge: 'JE', email: 'je3@railguard.in', password: 'je3123' },
];

/** Pre-role-rework account, kept as a muted fallback. */
const LEGACY_ACCOUNT = { badge: 'LEGACY', email: 'admin@railguard.com', password: 'admin123' };

// Senior roles (DEN/SSE) wear the accent chip; JE is muted; legacy is dimmest.
const badgeChipClass = (badge) =>
  badge === 'DEN' || badge === 'SSE'
    ? 'bg-accent/10 text-accent'
    : badge === 'LEGACY'
      ? 'bg-surface-2 text-ink-3'
      : 'bg-surface-3 text-ink-2';

/**
 * LoginPage — operator sign-in for the RailGuard console.
 * Same instrument-panel system as the console: solid surfaces, hairlines,
 * mono identifiers. A login gate is rare-view UI, so it earns one deliberate
 * entrance; everything after that is still.
 */
export default function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // Already signed in: straight to the console
  if (user) return <Navigate to="/" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) return;

    setLoading(true);
    setError(null);
    try {
      await login(email.trim(), password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err?.response?.data?.error || 'Sign-in failed. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (account) => {
    setEmail(account.email);
    setPassword(account.password);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
        className="w-full max-w-sm"
      >
        {/* Wordmark */}
        <div className="flex items-baseline gap-2 mb-4 px-1">
          <span className="text-base font-bold tracking-tight text-ink">RailGuard</span>
          <span className="font-mono text-[10px] uppercase tracking-wider text-ink-3">Operations</span>
        </div>

        <div className="panel p-5">
          <h1 className="text-sm font-semibold text-ink mb-4">Operator sign-in</h1>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label htmlFor="login-email" className="block text-[11px] text-ink-2 mb-1">
                Email
              </label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
                autoFocus
                className="w-full bg-surface-2 border border-line rounded-lg px-3 py-2 text-sm text-ink
                  placeholder-ink-3 focus:outline-none focus:border-accent/60
                  transition-colors duration-150"
              />
            </div>

            <div>
              <label htmlFor="login-password" className="block text-[11px] text-ink-2 mb-1">
                Password
              </label>
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="w-full bg-surface-2 border border-line rounded-lg px-3 py-2 text-sm text-ink
                  placeholder-ink-3 focus:outline-none focus:border-accent/60
                  transition-colors duration-150"
              />
            </div>

            {error && (
              <p
                role="alert"
                className="px-3 py-2 rounded-lg bg-crit/10 border border-crit/25 text-[11px] text-crit"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !email.trim() || !password}
              className="btn-accent w-full px-4 py-2.5 text-sm"
            >
              {loading ? 'Signing in' : 'Sign in'}
            </button>
          </form>

          {/* Demo credentials — click a row to fill the form */}
          <div className="mt-5 pt-4 border-t border-line">
            <p className="font-mono text-[10px] uppercase tracking-wide text-ink-3 mb-2">
              Demo accounts
            </p>
            <div className="space-y-1">
              {DEMO_ACCOUNTS.map((account) => (
                <button
                  key={account.email}
                  type="button"
                  onClick={() => fillDemo(account)}
                  className="w-full flex items-center gap-2 rounded-lg px-2 py-1.5 text-left
                    hover:bg-surface-2 transition-colors duration-150 cursor-pointer"
                >
                  <span className={`chip w-12 justify-center ${badgeChipClass(account.badge)}`}>
                    {account.badge}
                  </span>
                  <span className="font-mono text-[11px] text-ink-2">{account.email}</span>
                </button>
              ))}
            </div>
            <p className="text-[10px] text-ink-3 mt-2">
              Passwords: den123 / sse123 / je1123. Click an account to fill.
            </p>

            {/* Legacy fallback — pre-role-rework account, intentionally muted */}
            <div className="mt-3 pt-3 border-t border-line/60">
              <button
                type="button"
                onClick={() => fillDemo(LEGACY_ACCOUNT)}
                className="w-full flex items-center gap-2 rounded-lg px-2 py-1.5 text-left opacity-60
                  hover:opacity-100 hover:bg-surface-2 transition-[opacity,background-color] duration-150 cursor-pointer"
              >
                <span className={`chip w-12 justify-center ${badgeChipClass(LEGACY_ACCOUNT.badge)}`}>
                  {LEGACY_ACCOUNT.badge}
                </span>
                <span className="font-mono text-[11px] text-ink-3">{LEGACY_ACCOUNT.email}</span>
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
