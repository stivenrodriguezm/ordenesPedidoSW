import { HashRouter as Router, Routes, Route } from "react-router-dom";
import React, { useContext, useEffect } from "react";
import PrivateRoute from "./components/PrivateRoute"; 
import LoginPage from "./pages/LoginPage";
import ReferenciasPage from "./pages/ReferenciasPage";
import ProveedoresPage from "./pages/ProveedoresPage";
import OrdenesPage from "./pages/OrdenesPage";
import EditarProveedorPage from "./pages/EditarProveedorPage";
import CrearPedidoPage from "./pages/CrearPedidoPage";
import PerfilPage from "./pages/PerfilPage";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import HomePage from "./pages/HomePage";
import Clientes from "./pages/Clientes";
import Ventas from "./pages/Ventas";
import EditarVenta from "./pages/EditarVenta";
import NuevaVenta from "./pages/NuevaVenta";
import Caja from "./pages/Caja";
import RecibosCaja from "./pages/RecibosCaja";
import ComprobantesEgreso from "./pages/ComprobantesEgreso";
import { AppContext } from "./AppContext";
import LottusLoader from "./components/LottusLoader";

const MainLayout = ({ children }) => {
  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-content">
        <Header />
        <main>{children}</main>
      </div>
    </div>
  );
};

function App() {
  const { isLoggingIn, setIsLoggingIn } = useContext(AppContext);

  useEffect(() => {
    if (isLoggingIn) {
      const timer = setTimeout(() => {
        setIsLoggingIn(false);
      }, 2500); // Coincide con la duración de la animación + un pequeño margen

      return () => clearTimeout(timer);
    }
  }, [isLoggingIn, setIsLoggingIn]);

  return (
    <Router>
      {isLoggingIn && <LottusLoader />}
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/*"
          element={
            <PrivateRoute>
              <MainLayout>
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/ordenes" element={<OrdenesPage />} />
                  <Route path="/referencias" element={<ReferenciasPage />} />
                  <Route path="/proveedores" element={<ProveedoresPage />} />
                  <Route path="/proveedores/editar/:id" element={<EditarProveedorPage />} />
                  <Route path="/ordenes/nuevo" element={<CrearPedidoPage />} />
                  <Route path="/perfil" element={<PerfilPage />} />
                  <Route path="/clientes" element={<Clientes />} />
                  <Route path="/ventas" element={<Ventas />} />
                  <Route path="/nuevaVenta" element={<NuevaVenta />} />
                  <Route path="/EditarVenta/:id/" element={<EditarVenta />} />
                  <Route path="/caja" element={<Caja />} />
                  <Route path="/recibos-caja" element={<RecibosCaja />} />
                  <Route path="/comprobantes-egreso" element={<ComprobantesEgreso />} />
                </Routes>
              </MainLayout>
            </PrivateRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
