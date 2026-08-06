import React from 'react';
import { Link } from 'react-router-dom';
import { FaCompass } from 'react-icons/fa';
import { EmptyState, Button } from '../components/ui';

const NotFoundPage = () => {
  return (
    <div className="ds-page ds-fade-in" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '70vh' }}>
      <EmptyState
        icon={FaCompass}
        title="404 — Página no encontrada"
        message="La página que buscas no existe o fue movida."
        action={
          <Link to="/" style={{ textDecoration: 'none' }}>
            <Button variant="primary">Volver al inicio</Button>
          </Link>
        }
      />
    </div>
  );
};

export default NotFoundPage;
