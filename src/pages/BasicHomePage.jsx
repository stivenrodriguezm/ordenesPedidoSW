import React, { useContext } from 'react';
import { AppContext } from '../AppContext';
import { PageHeader } from '../components/ui';
import { FaHome } from 'react-icons/fa';

// Página de inicio "básica" para roles sin dashboard asignado (personal o
// general) — ej. marketing, transportador. No hace ninguna llamada a datos
// de negocio: es deliberadamente neutra hasta que ese rol tenga un permiso
// de dashboard explícito en Gestión de Usuarios.
const BasicHomePage = () => {
    const { usuario } = useContext(AppContext);

    return (
        <div className="ds-page ds-fade-in">
            <PageHeader
                icon={FaHome}
                title={`Hola, ${usuario?.first_name || usuario?.username || ''}`}
                subtitle="Usa el menú lateral para ir a tu sección de trabajo."
            />
        </div>
    );
};

export default BasicHomePage;
