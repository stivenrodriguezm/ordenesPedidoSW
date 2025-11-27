import { HashRouter as Router, Routes, Route } from "react-router-dom";
import React, { useContext, useEffect, useState } from "react";
import PrivateRoute from "./PrivateRoute";
import LoginPage from "./pages/LoginPage";
import ReferenciasPage from "./pages/ReferenciasPage";
import ProveedoresPage from "./pages/ProveedoresPage";
import OrdenesPage from "./pages/OrdenesPage";

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
import TestOrdenes from "./pages/TestOrdenes";
import { AppContext } from "./AppContext";
import LottusLoader from "./components/LottusLoader";

const MainLayout = ({ children }) => {
  const [isSidebarOpen, setSidebarOpen] = useState(false); // Mobile toggle
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    // Desktop collapse state (persisted)
    const saved = localStorage.getItem('sidebarCollapsed');
    return saved === 'true';
  });

  const toggleSidebar = () => {
    setSidebarOpen(!isSidebarOpen);
  };

  const toggleCollapse = () => {
    const newState = !isSidebarCollapsed;
    setIsSidebarCollapsed(newState);
    localStorage.setItem('sidebarCollapsed', newState);
  };

  return (
    <div className={`app-container ${isSidebarOpen ? "sidebar-open" : ""} ${isSidebarCollapsed ? "sidebar-collapsed" : ""}`}>
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setSidebarOpen(false)}
        isCollapsed={isSidebarCollapsed}
        toggleCollapse={toggleCollapse}
      />
      <div className="main-content">
        <Header onMenuClick={toggleSidebar} isCollapsed={isSidebarCollapsed} />
        <main className="content-wrapper">{children}</main>
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
                  <Route path="/ordenes" element={<PrivateRoute roles={['administrador', 'auxiliar', 'vendedor']}><OrdenesPage /></PrivateRoute>} />
                  <Route path="/referencias" element={<PrivateRoute roles={['administrador', 'auxiliar']}><ReferenciasPage /></PrivateRoute>} />
                  <Route path="/proveedores" element={<PrivateRoute roles={['administrador', 'auxiliar']}><ProveedoresPage /></PrivateRoute>} />
                  <Route path="/ordenes/nuevo" element={<PrivateRoute roles={['administrador', 'auxiliar', 'vendedor']}><CrearPedidoPage /></PrivateRoute>} />
                  <Route path="/perfil" element={<PrivateRoute><PerfilPage /></PrivateRoute>} />
                  <Route path="/clientes" element={<PrivateRoute roles={['administrador', 'auxiliar']}><Clientes /></PrivateRoute>} />
                  <Route path="/ventas" element={<PrivateRoute roles={['administrador', 'auxiliar', 'vendedor']}><Ventas /></PrivateRoute>} />
                  <Route path="/nuevaVenta" element={<PrivateRoute roles={['administrador', 'auxiliar']}><NuevaVenta /></PrivateRoute>} />
                  <Route path="/EditarVenta/:id/" element={<PrivateRoute roles={['administrador', 'auxiliar']}><EditarVenta /></PrivateRoute>} />
                  <Route path="/caja" element={<PrivateRoute roles={['administrador', 'auxiliar']}><Caja /></PrivateRoute>} />
                  <Route path="/recibos-caja" element={<PrivateRoute roles={['administrador', 'auxiliar']}><RecibosCaja /></PrivateRoute>} />
                  <Route path="/comprobantes-egreso" element={<PrivateRoute roles={['administrador', 'auxiliar']}><ComprobantesEgreso /></PrivateRoute>} />
                  <Route path="/test-ordenes" element={<TestOrdenes />} />
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
