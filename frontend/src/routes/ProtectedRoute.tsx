import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import type { ProtectedRouteProps } from "../types";

export default function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const { user, loading } = useAuth();

  if (loading)
    return (
      <div className="page">
        <div className="card">Chargement...</div>
      </div>
    );
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}
