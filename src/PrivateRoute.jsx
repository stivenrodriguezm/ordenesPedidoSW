import { Navigate } from "react-router-dom";
import { useContext } from "react";
import { AppContext } from "./AppContext";

const GlobalLoader = () => (
  <>
    <style>
      {`
        @keyframes fill-text {
          from {
            width: 0%;
          }
          to {
            width: 100%;
          }
        }

        .global-loader {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          display: flex;
          justify-content: center;
          align-items: center;
          background-color: var(--color-background);
          z-index: 9999;
        }

        .loader-logo {
          font-family: var(--font-display);
          font-size: 6rem;
          font-weight: 400;
          position: relative;
          color: var(--color-border); /* Color del texto base (gris) */
        }

        .loader-logo::before {
          content: 'LOTTUS';
          position: absolute;
          top: 0;
          left: 0;
          width: 0%;
          height: 100%;
          color: var(--color-text-primary); /* Color del texto que se va llenando (negro) */
          overflow: hidden;
          animation: fill-text 2s ease-in-out infinite;
        }
      `}
    </style>
    <div className="global-loader">
      <div className="loader-logo">LOTTUS</div>
    </div>
  </>
);

function PrivateRoute({ children, roles }) {
  const token = localStorage.getItem("accessToken");
  const { usuario, isLoading } = useContext(AppContext);

  if (isLoading) {
    return <GlobalLoader />;
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
