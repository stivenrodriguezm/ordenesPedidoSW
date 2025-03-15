import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import PrivateRoute from './PrivateRoute';
import LoginPage from './pages/LoginPage';
import ReferenciasPage from './pages/ReferenciasPage';
import ProveedoresPage from './pages/ProveedoresPage';
import OrdenesPage from './pages/OrdenesPage';
import NuevoProveedorPage from './pages/NuevoProveedorPage';
import EditarProveedorPage from './pages/EditarProveedorPage';
import CrearPedidoPage from './pages/CrearPedidoPage';
import PerfilPage from './pages/PerfilPage';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import HomePage from './pages/HomePage';

function AppLayout() {
  const location = useLocation();
  const isLoginPage = location.pathname === "/login";

  return (
    <div className="app-container">
      {!isLoginPage && <Sidebar />}
      <div className="main-content">
        {!isLoginPage && <Header />}
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<HomePage />} />
          <Route path="/ordenesPedidoSW/referencias" element={<PrivateRoute component={ReferenciasPage} />} />
          <Route path="/ordenesPedidoSW/proveedores" element={<PrivateRoute component={ProveedoresPage} />} />
          <Route path="/ordenesPedidoSW/ordenes" element={<PrivateRoute component={OrdenesPage} />} />
          <Route path="/ordenesPedidoSW/proveedores/nuevo" element={<PrivateRoute component={NuevoProveedorPage} />} />
          <Route path="/ordenesPedidoSW/proveedores/editar/:id" element={<PrivateRoute component={EditarProveedorPage} />} />
          <Route path="/ordenesPedidoSW/ordenes/nuevo" element={<PrivateRoute component={CrearPedidoPage} />} />
          <Route path="/ordenesPedidoSW/ordenes" element={<OrdenesPage />} />
          <Route path="/ordenesPedidoSW/perfil" element={<PerfilPage />} /> {/* Nueva ruta */}
        </Routes>
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppLayout />
    </Router>
  );
}

export default App;