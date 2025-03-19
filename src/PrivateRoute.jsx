import { Navigate } from "react-router-dom";

const PrivateRoute = ({ component: Component }) => {
  const token = localStorage.getItem("accessToken");
  return token ? <Component /> : <Navigate to="/ordenesPedidoSW/login" />;
};


export default PrivateRoute;
