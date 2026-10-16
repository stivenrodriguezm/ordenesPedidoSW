import { Navigate } from "react-router-dom";
import { useContext } from "react";
import { AppContext, usePermissions } from "./AppContext";
import LottusLoader from "./components/LottusLoader";
import { ErrorState } from "./components/ui";

function PrivateRoute({ children, roles, feature }) {
  const token = localStorage.getItem("accessToken");
  const { usuario, isLoading, sessionError, retrySession } = useContext(AppContext);
  const hasPermission = usePermissions();

  // Show loader while verifying session
  if (isLoading) {
    return <LottusLoader />;
  }

  // No token → go to login
  if (!token) {
    return <Navigate to="/login" />;
  }

  // La carga de la sesión falló por red/servidor: salida visible con reintento.
  if (!usuario && sessionError) {
    return <ErrorState message={sessionError} onRetry={retrySession} />;
  }

  // Still waiting for user data with a valid token → show loader
  if (!usuario) {
    return <LottusLoader />;
  }

  // Legacy role check (backward compat, only used if no feature is set)
  if (roles && !feature) {
    const userRole = usuario.role ? usuario.role.toLowerCase() : '';
    if (!roles.includes(userRole)) {
      return <Navigate to="/" />;
    }
  }

  // Feature-based permission check (misma lógica de aliases que usePermissions)
  if (feature) {
    if (!hasPermission(feature)) {
      return <Navigate to="/" />;
    }
  }

  return children;
}

export default PrivateRoute;
