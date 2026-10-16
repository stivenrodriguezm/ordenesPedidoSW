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

    if (role === 'administrador') {
        return <AdminHomePage />;
    } else if (hasPermission('VER_DASHBOARD_PERSONAL')) {
        return <VendedorHomePage />;
    } else if (hasPermission('VER_DASHBOARD_GENERAL')) {
        return <AdminHomePage />;
    } else if (role === 'transportador') {
        return <Navigate to="/suministros/remisiones" replace />;
    } else {
        return <BasicHomePage />;
    }
};

export default HomePage;