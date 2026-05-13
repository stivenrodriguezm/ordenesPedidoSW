// src/pages/HomePage.jsx
import React, { useContext } from 'react';
import { AppContext } from '../AppContext';
import VendedorHomePage from './VendedorHomePage';
import AdminHomePage from './AdminHomePage';
import { Navigate } from 'react-router-dom';

const HomePage = () => {
    const { usuario } = useContext(AppContext);

    if (usuario?.role.toLowerCase() === 'vendedor') {
        return <VendedorHomePage />;
    } else if (usuario?.role.toLowerCase() === 'transportador') {
        return <Navigate to="/suministros/remisiones" replace />;
    } else {
        return <AdminHomePage />;
    }
};

export default HomePage;