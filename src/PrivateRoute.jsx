import { Navigate } from "react-router-dom";
import { useContext } from "react";
import { AppContext } from "./AppContext";
import LottusLoader from "./components/LottusLoader";

function PrivateRoute({ children, roles }) {
  const token = localStorage.getItem("accessToken");
  const { usuario, isLoading } = useContext(AppContext);

  if (isLoading) {
    return <LottusLoader />;
  }

  if (!token) {
    return <Navigate to="/login" />;
  }

  if (roles && !roles.includes(usuario?.role.toLowerCase())) {
    return <Navigate to="/" />; // Redirect to home if role not allowed
  }

  return children;
}

export default PrivateRoute;
