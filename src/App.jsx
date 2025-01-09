import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import OrdenesPage from "./pages/OrdenesPage";
import ReferenciasPage from "./pages/ReferenciasPage";
import ProveedoresPage from "./pages/ProveedoresPage";
import PrivateRoute from "./components/PrivateRoute";
import NuevoProveedorPage from "./pages/NuevoProveedorPage";
import EditarProveedorPage from "./pages/EditarProveedorPage";
import CrearPedidoPage from "./pages/CrearPedidoPage";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";

function Layout({ children }) {
  const location = useLocation();

  const showSidebarAndHeader = location.pathname !== "/login";

  return (
    <>
      {showSidebarAndHeader && <Sidebar />}
      {showSidebarAndHeader && <Header />}
      {children}
    </>
  );
}

function App() {
  return (
    <Router basename="/ordenesPedidoSW">
      <Layout>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <PrivateRoute>
                <OrdenesPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/referencias"
            element={
              <PrivateRoute>
                <ReferenciasPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/proveedores"
            element={
              <PrivateRoute>
                <ProveedoresPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/nuevo-proveedor"
            element={
              <PrivateRoute>
                <NuevoProveedorPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/editar-proveedor/:id"
            element={
              <PrivateRoute>
                <EditarProveedorPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/crear-pedido"
            element={
              <PrivateRoute>
                <CrearPedidoPage />
              </PrivateRoute>
            }
          />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
