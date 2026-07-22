import { HashRouter as Router, Routes, Route } from "react-router-dom";
import React, { useContext, useEffect, useState, Suspense, lazy } from "react";
import PrivateRoute from "./PrivateRoute";
const LoginPage = lazy(() => import("./pages/LoginPage"));
const ReferenciasPage = lazy(() => import("./pages/ReferenciasPage"));
const ProveedoresPage = lazy(() => import("./pages/ProveedoresPage"));
const OrdenesPage = lazy(() => import("./pages/OrdenesPage"));

const CrearPedidoPage = lazy(() => import("./pages/CrearPedidoPage"));
const PerfilPage = lazy(() => import("./pages/PerfilPage"));
const UsuariosPage = lazy(() => import("./pages/UsuariosPage"));
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
const HomePage = lazy(() => import("./pages/HomePage"));
const Clientes = lazy(() => import("./pages/Clientes"));
const Ventas = lazy(() => import("./pages/Ventas"));
const EditarVenta = lazy(() => import("./pages/EditarVenta"));
const NuevaVenta = lazy(() => import("./pages/NuevaVenta"));
const Caja = lazy(() => import("./pages/Caja"));
const RecibosCaja = lazy(() => import("./pages/RecibosCaja"));
const ComprobantesEgreso = lazy(() => import("./pages/ComprobantesEgreso"));

const TelasPage = lazy(() => import("./pages/TelasPage"));

const FacturasProveedorPage = lazy(() => import("./pages/FacturasProveedorPage"));
const RemisionesPage = lazy(() => import("./pages/RemisionesPage"));
const NuevaRemisionPage = lazy(() => import("./pages/NuevaRemisionPage"));
const InventarioPage = lazy(() => import("./pages/InventarioPage"));
const BasesDatosPage = lazy(() => import("./pages/BasesDatosPage"));
import { AppContext } from "./AppContext";
import LottusLoader from "./components/LottusLoader";
import Loader from "./components/Loader";

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
      <Suspense fallback={<Loader />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/*"
          element={
            <PrivateRoute>
              <MainLayout>
                <Suspense fallback={<Loader />}>
      <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/ordenes" element={<PrivateRoute feature="VER_ORDENES"><OrdenesPage /></PrivateRoute>} />
                  <Route path="/telas" element={<PrivateRoute feature="VER_PEDIDOS_TELAS"><TelasPage /></PrivateRoute>} />
                  <Route path="/referencias" element={<PrivateRoute feature="ADMINISTRAR_REFERENCIAS"><ReferenciasPage /></PrivateRoute>} />
                  <Route path="/proveedores" element={<PrivateRoute feature="ADMINISTRAR_PROVEEDORES"><ProveedoresPage /></PrivateRoute>} />
                  <Route path="/ordenes/nuevo" element={<PrivateRoute feature="CREAR_ORDEN"><CrearPedidoPage /></PrivateRoute>} />
                  <Route path="/perfil" element={<PrivateRoute><PerfilPage /></PrivateRoute>} />
                  <Route path="/gestion-usuarios" element={<PrivateRoute feature="VER_USUARIOS"><UsuariosPage /></PrivateRoute>} />
                  <Route path="/bases-de-datos" element={<PrivateRoute feature="BASES_DATOS"><BasesDatosPage /></PrivateRoute>} />
                  <Route path="/clientes" element={<PrivateRoute feature="VER_CLIENTES"><Clientes /></PrivateRoute>} />

                  <Route path="/ventas" element={<PrivateRoute feature="VER_VENTAS"><Ventas /></PrivateRoute>} />
                  <Route path="/nuevaVenta" element={<PrivateRoute feature="CREAR_VENTA"><NuevaVenta /></PrivateRoute>} />
                  <Route path="/EditarVenta/:id/" element={<PrivateRoute feature="EDITAR_VENTA"><EditarVenta /></PrivateRoute>} />
                  <Route path="/caja" element={<PrivateRoute feature="ACCESO_CAJA"><Caja /></PrivateRoute>} />
                  <Route path="/recibos-caja" element={<PrivateRoute feature="ACCESO_RECIBOS"><RecibosCaja /></PrivateRoute>} />
                  <Route path="/comprobantes-egreso" element={<PrivateRoute feature="ACCESO_EGRESOS"><ComprobantesEgreso /></PrivateRoute>} />

                  <Route path="/suministros/facturas" element={<PrivateRoute feature="VER_FACTURAS"><FacturasProveedorPage /></PrivateRoute>} />
                  <Route path="/suministros/remisiones" element={<PrivateRoute feature="VER_REMISIONES"><RemisionesPage /></PrivateRoute>} />
                  <Route path="/nuevaRemision" element={<PrivateRoute feature="CREAR_REMISION"><NuevaRemisionPage /></PrivateRoute>} />
                  <Route path="/suministros/inventario" element={<PrivateRoute feature="VER_INVENTARIO"><InventarioPage /></PrivateRoute>} />
                </Routes>
      </Suspense>
              </MainLayout>
            </PrivateRoute>
          }
        />
      </Routes>
      </Suspense>
    </Router>
  );
}

export default App;
