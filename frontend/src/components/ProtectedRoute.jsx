import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * ProtectedRoute — gates the console behind authentication.
 * Shows nothing while the stored session is being restored (prevents a
 * flash-redirect to /login on refresh), then redirects if unauthenticated.
 */
export default function ProtectedRoute({ children }) {
  const { user, restoring } = useAuth();

  if (restoring) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <span className="font-mono text-xs text-ink-3">Restoring session</span>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
