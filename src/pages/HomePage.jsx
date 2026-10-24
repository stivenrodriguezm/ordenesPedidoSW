// src/pages/HomePage.jsx
import React, { useContext } from 'react';
import { AppContext, usePermissions } from '../AppContext';
import VendedorHomePage from './VendedorHomePage';
import AdminHomePage from './AdminHomePage';
import BasicHomePage from './BasicHomePage';
import { Navigate } from 'react-router-dom';

// Qué dashboard ve cada rol se decide por permiso (VER_DASHBOARD_PERSONAL /
// VER_DASHBOARD_GENERAL, configurables por rol en Gestión de Usuarios), no
// por el nombre del rol — así un rol sin ninguno de los dos (marketing,
// transportador, etc.) cae en el dashboard básico sin datos, en vez de
// heredar por defecto el general.
const HomePage = () => {
    const { usuario } = useContext(AppContext);
    const hasPermission = usePermissions();
    const role = usuario?.role?.toLowerCase();

    const general = hasPermission('VER_DASHBOARD_GENERAL');
    const personal = hasPermission('VER_DASHBOARD_PERSONAL');
    // Con ambos permisos, el administrador entra al general y los demás al personal.
    if (general && (role === 'administrador' || !personal)) {
        return <AdminHomePage />;
    } else if (personal) {
        return <VendedorHomePage />;
    } else if (role === 'transportador') {
        return <Navigate to="/suministros/remisiones" replace />;
    } else {
        return <BasicHomePage />;
    }
};

export default HomePage;