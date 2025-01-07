import { Navigate } from "react-router-dom";

function PrivateRoute({ children }) {
  const accessToken = localStorage.getItem("accessToken");
  return accessToken ? children : <Navigate to="/login" />;
}

export default PrivateRoute;
