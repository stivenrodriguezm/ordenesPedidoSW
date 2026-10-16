import { HashRouter as Router, Routes, Route, Navigate, Link, useLocation } from "react-router-dom";
import React, { useContext, useEffect, useState, Suspense, lazy } from "react";
import PrivateRoute from "./PrivateRoute";
const LoginPage = lazy(() => import("./pages/LoginPage"));
const ReferenciasPage = lazy(() => import("./pages/ReferenciasPage"));
const ProveedoresPage = lazy(() => import("./pages/ProveedoresPage"));
const OrdenesPage = lazy(() => import("./pages/OrdenesPage"));

const CrearPedidoPage = lazy(() => import("./pages/CrearPedidoPage"));
const PerfilPage = lazy(() => import("./pages/PerfilPage"));
const UsuariosPage = lazy(() => import("./pages/UsuariosPage"));
const ChatGeneralPage = lazy(() => import("./pages/ChatGeneralPage"));
const ChatAgentePage = lazy(() => import("./pages/ChatAgentePage"));
const OficinaIAPage = lazy(() => import("./pages/OficinaIAPage"));
const ConfiguracionIAPage = lazy(() => import("./pages/ConfiguracionIAPage"));
import Sidebar from "./components/Sidebar";
import ChatLateralProvider from "./components/chat/ChatLateralProvider";
import { FaBars } from "react-icons/fa";
const HomePage = lazy(() => import("./pages/HomePage"));
const Clientes = lazy(() => import("./pages/Clientes"));
const Ventas = lazy(() => import("./pages/Ventas"));
const EditarVenta = lazy(() => import("./pages/EditarVenta"));
const NuevaVenta = lazy(() => import("./pages/NuevaVenta"));
const Caja = lazy(() => import("./pages/Caja"));
const RecibosCaja = lazy(() => import("./pages/RecibosCaja"));
const ComprobantesEgreso = lazy(() => import("./pages/ComprobantesEgreso"));
const NominaPage = lazy(() => import("./pages/NominaPage"));
const NuevaComprobanteEgresoPage = lazy(() => import("./pages/NuevaComprobanteEgresoPage"));
const EditarComprobanteEgresoPage = lazy(() => import("./pages/EditarComprobanteEgresoPage"));

const TelasPage = lazy(() => import("./pages/TelasPage"));

const FacturasProveedorPage = lazy(() => import("./pages/FacturasProveedorPage"));
const NuevaFacturaPage = lazy(() => import("./pages/NuevaFacturaPage"));
const RemisionesPage = lazy(() => import("./pages/RemisionesPage"));
const NuevaRemisionPage = lazy(() => import("./pages/NuevaRemisionPage"));
const InventarioPage = lazy(() => import("./pages/InventarioPage"));
const BasesDatosPage = lazy(() => import("./pages/BasesDatosPage"));
const PaginawebAdminPage = lazy(() => import("./pages/paginaweb/PaginawebAdminPage"));
const ListaPreciosPage = lazy(() => import("./pages/listaprecios/ListaPreciosPage"));
const ListaPreciosAdminPage = lazy(() => import("./pages/listaprecios/ListaPreciosAdminPage"));
import { AppContext, NotificationContext } from "./AppContext";
import LottusLoader from "./components/LottusLoader";
import Loader from "./components/Loader";
import AppNotification from "./components/AppNotification";
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));

const MainLayout = ({ children }) => {
  const ubicacion=useLocation();
  const esOficina=/^\/ia\/?$/i.test(ubicacion.pathname);
  const [isSidebarOpen, setSidebarOpen] = useState(false); // Mobile toggle
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    // Desktop collapse state (persisted)
    const saved = localStorage.getItem('sidebarCollapsed');
    return saved === 'true';
  });

  const toggleSidebar = () => {
    setSidebarOpen(!isSidebarOpen);
  };

  // Con el menú móvil abierto, la página detrás no debe poder scrollearse
  // — sin esto, un gesto que empieza sobre el menú puede terminar
  // moviendo la página oculta detrás (el "scroll cruzado" reportado).
  useEffect(() => {
    if (isSidebarOpen) {
      const previousOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = previousOverflow; };
    }
  }, [isSidebarOpen]);

  const toggleCollapse = () => {
    const newState = !isSidebarCollapsed;
    setIsSidebarCollapsed(newState);
    localStorage.setItem('sidebarCollapsed', newState);
  };

  return (
    <div className={`app-container ${isSidebarOpen ? "sidebar-open" : ""} ${isSidebarCollapsed ? "sidebar-collapsed" : ""} ${esOficina?"app-container--oficina":""}`}>
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setSidebarOpen(false)}
        isCollapsed={isSidebarCollapsed}
        toggleCollapse={toggleCollapse}
      />
      <div className="main-content">
        {esOficina ? (
          <button type="button" className="of-menu-movil" onClick={toggleSidebar} aria-label="Abrir menú"><FaBars /></button>
        ) : (
          <div className="barra-movil">
            <button type="button" className="mobile-menu-btn" onClick={toggleSidebar} aria-label="Abrir menú"><FaBars /></button>
            <Link to="/" className="barra-movil__marca" aria-label="LOTTUS, ir al inicio">LOTTUS</Link>
          </div>
        )}
        <ChatLateralProvider><main className="content-wrapper">{children}</main></ChatLateralProvider>
      </div>
    </div>
  );
};

function App() {
  const { isLoggingIn, setIsLoggingIn } = useContext(AppContext);
  const { notification, clearNotification } = useContext(NotificationContext);

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
      <AppNotification
        message={notification?.message}
        type={notification?.type}
        onClose={clearNotification}
      />
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
                  <Route path="/calidad-clientes" element={<Navigate to="/bases-de-datos" replace />} />

                  <Route path="/ventas" element={<PrivateRoute feature="VER_VENTAS"><Ventas /></PrivateRoute>} />
                  <Route path="/ventas/nueva" element={<PrivateRoute feature="CREAR_VENTA"><NuevaVenta /></PrivateRoute>} />
                  <Route path="/ventas/:id/editar" element={<PrivateRoute feature="EDITAR_VENTA"><EditarVenta /></PrivateRoute>} />
                  {/* Redirects de rutas antiguas */}
                  <Route path="/nuevaVenta" element={<Navigate to="/ventas/nueva" replace />} />
                  <Route path="/EditarVenta/:id/" element={<Navigate to="/ventas/:id/editar" replace />} />
                  <Route path="/caja" element={<PrivateRoute feature="ACCESO_CAJA"><Caja /></PrivateRoute>} />
                  <Route path="/recibos-caja" element={<PrivateRoute feature="ACCESO_RECIBOS"><RecibosCaja /></PrivateRoute>} />
                  <Route path="/comprobantes-egreso" element={<PrivateRoute feature="ACCESO_EGRESOS"><ComprobantesEgreso /></PrivateRoute>} />
                  <Route path="/comprobantes-egreso/nuevo" element={<PrivateRoute feature="CREAR_COMPROBANTE_EGRESO"><NuevaComprobanteEgresoPage /></PrivateRoute>} />
                  <Route path="/comprobantes-egreso/:id/editar" element={<PrivateRoute feature="EDITAR_COMPROBANTE_EGRESO"><EditarComprobanteEgresoPage /></PrivateRoute>} />
                  <Route path="/nomina" element={<PrivateRoute feature="VER_NOMINA"><NominaPage /></PrivateRoute>} />
                  <Route path="/IA" element={<PrivateRoute feature="ACCESO_OFICINA"><OficinaIAPage /></PrivateRoute>} />
                  <Route path="/IA/general" element={<PrivateRoute feature="USAR_ASISTENTE_IA"><ChatGeneralPage /></PrivateRoute>} />
                  <Route path="/IA/agentes/:perfilId" element={<PrivateRoute feature="USAR_ASISTENTE_IA"><ChatAgentePage /></PrivateRoute>} />
                  <Route path="/IA/configuracion" element={<PrivateRoute feature="GESTIONAR_PERFILES_IA"><ConfiguracionIAPage /></PrivateRoute>} />
                  <Route path="/chat" element={<Navigate to="/IA" replace />} />
                  <Route path="/comisiones" element={<Navigate to="/nomina" replace />} />

                  <Route path="/suministros/facturas" element={<PrivateRoute feature="VER_FACTURAS"><FacturasProveedorPage /></PrivateRoute>} />
                  <Route path="/suministros/facturas/nueva" element={<PrivateRoute feature="CREAR_FACTURA"><NuevaFacturaPage /></PrivateRoute>} />
                  <Route path="/suministros/facturas/:id/editar" element={<PrivateRoute feature="EDITAR_FACTURA"><NuevaFacturaPage /></PrivateRoute>} />
                  <Route path="/suministros/remisiones" element={<PrivateRoute feature="VER_REMISIONES"><RemisionesPage /></PrivateRoute>} />
                  <Route path="/suministros/remisiones/nueva" element={<PrivateRoute feature="CREAR_REMISION"><NuevaRemisionPage /></PrivateRoute>} />
                  {/* Redirect de ruta antigua */}
                  <Route path="/nuevaRemision" element={<Navigate to="/suministros/remisiones/nueva" replace />} />
                  <Route path="/suministros/inventario" element={<PrivateRoute feature="VER_INVENTARIO"><InventarioPage /></PrivateRoute>} />
                  <Route path="/paginaweb/gestion" element={<PrivateRoute feature="GESTION_WEB"><PaginawebAdminPage /></PrivateRoute>} />
                  <Route path="/lista-precios" element={<PrivateRoute feature="VER_LISTA_PRECIOS"><ListaPreciosPage /></PrivateRoute>} />
                  <Route path="/lista-precios/administrar" element={<PrivateRoute feature="EDITAR_LISTA_PRECIOS"><ListaPreciosAdminPage /></PrivateRoute>} />
                  <Route path="*" element={<NotFoundPage />} />
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
