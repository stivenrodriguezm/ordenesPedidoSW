// src/pages/HomePage.jsx
import React, { useContext } from 'react';
import { AppContext } from '../AppContext';
import VendedorHomePage from './VendedorHomePage';
import AdminHomePage from './AdminHomePage';

const HomePage = () => {
    const { usuario } = useContext(AppContext);

    if (usuario?.role.toLowerCase() === 'vendedor') {
        return <VendedorHomePage />;
    } else {
        return <AdminHomePage />;
    }
};

export default HomePage;