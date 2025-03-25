import { HashRouter as Router, Routes, Route } from "react-router-dom";
import PrivateRoute from "./PrivateRoute";
import LoginPage from "./pages/LoginPage";
import ReferenciasPage from "./pages/ReferenciasPage";
import ProveedoresPage from "./pages/ProveedoresPage";
import OrdenesPage from "./pages/OrdenesPage";
import NuevoProveedorPage from "./pages/NuevoProveedorPage";
import EditarProveedorPage from "./pages/EditarProveedorPage";
import CrearPedidoPage from "./pages/CrearPedidoPage";
import PerfilPage from "./pages/PerfilPage";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import HomePage from "./pages/HomePage";
import { AppProvider } from "./AppContext"; // Asegúrate de envolver la app con el proveedor

// Layout para páginas con sidebar y header
const MainLayout = () => {
  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-content">
        <Header />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/ordenes" element={<PrivateRoute component={OrdenesPage} />} />
          <Route path="/referencias" element={<PrivateRoute component={ReferenciasPage} />} />
          <Route path="/proveedores" element={<PrivateRoute component={ProveedoresPage} />} />
          <Route path="/proveedores/nuevo" element={<PrivateRoute component={NuevoProveedorPage} />} />
          <Route path="/proveedores/editar/:id" element={<PrivateRoute component={EditarProveedorPage} />} />
          <Route path="/ordenes/nuevo" element={<PrivateRoute component={CrearPedidoPage} />} />
          <Route path="/perfil" element={<PerfilPage />} />
        </Routes>
      </div>
    </div>
  );
};

function App() {
  return (
    <AppProvider>
      <Router>
        <Routes>
          {/* Ruta para la página de login, sin sidebar ni header */}
          <Route path="/login" element={<LoginPage />} />
          {/* Rutas con sidebar y header */}
          <Route path="/*" element={<MainLayout />} />
        </Routes>
      </Router>
    </AppProvider>
  );
}

export default App;