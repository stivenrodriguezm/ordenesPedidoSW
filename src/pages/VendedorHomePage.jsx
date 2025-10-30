import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { AppContext } from '../AppContext';
import api from '../services/api';
import { FaPlus, FaClipboardList, FaFileInvoiceDollar } from 'react-icons/fa';
import './VendedorHomePage.css';
import Loader from '../components/Loader';

const VendedorHomePage = () => {
    const { usuario } = useContext(AppContext);
    const [greeting, setGreeting] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const getGreeting = () => {
            const now = new Date();
            const options = { timeZone: 'America/Bogota', hour: '2-digit', hour12: false };
            const hour = parseInt(new Intl.DateTimeFormat('en-US', options).format(now));

            if (hour < 12) return 'Buenos días';
            if (hour < 18) return 'Buenas tardes';
            return 'Buenas noches';
        };
        setGreeting(getGreeting());
        setLoading(false);
    }, []);

    if (loading) {
        return <Loader text="Cargando tu espacio..." />;
    }

    return (
        <div className="vendedor-home-container">
            <header className="vendedor-hero">
                <h1 className="vendedor-greeting">{`${greeting}, ${usuario?.first_name || ''}`}!</h1>
                <p className="vendedor-quote">"El éxito es la suma de pequeños esfuerzos repetidos día tras día."</p>
            </header>

            <section className="quick-actions">
                <h2>Accesos Rápidos</h2>
                <div className="actions-grid">
                    <Link to="/ordenes/nuevo" className="action-card">
                        <FaPlus className="action-icon" />
                        <h3>Crear Pedido</h3>
                        <p>Inicia un nuevo pedido para un cliente.</p>
                    </Link>
                    <Link to="/ventas" className="action-card">
                        <FaFileInvoiceDollar className="action-icon" />
                        <h3>Mis Ventas</h3>
                        <p>Consulta el historial de tus ventas.</p>
                    </Link>
                    <Link to="/ordenes" className="action-card">
                        <FaClipboardList className="action-icon" />
                        <h3>Mis Pedidos</h3>
                        <p>Revisa el estado de tus pedidos.</p>
                    </Link>
                </div>
            </section>
        </div>
    );
};

export default VendedorHomePage;