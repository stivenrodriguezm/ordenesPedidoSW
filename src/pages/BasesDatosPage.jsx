import React, { useState } from 'react';
import { usePermissions } from '../AppContext';
import Clientes from './Clientes';
import ProveedoresPage from './ProveedoresPage';
import ReferenciasPage from './ReferenciasPage';
import { FaUsers, FaWarehouse, FaBoxes } from 'react-icons/fa';
import './BasesDatosPage.css';

function BasesDatosPage() {
  const hasPermission = usePermissions();
  
  const tabs = [];
  if (hasPermission('VER_CLIENTES')) tabs.push({ id: 'clientes', label: 'Clientes', icon: <FaUsers />, component: <Clientes /> });
  if (hasPermission('VER_PROVEEDORES')) tabs.push({ id: 'proveedores', label: 'Proveedores', icon: <FaWarehouse />, component: <ProveedoresPage /> });
  if (hasPermission('VER_REFERENCIAS')) tabs.push({ id: 'referencias', label: 'Referencias', icon: <FaBoxes />, component: <ReferenciasPage /> });

  const [activeTab, setActiveTab] = useState(tabs.length > 0 ? tabs[0].id : null);

  if (tabs.length === 0) {
    return (
      <div className="page-container" style={{ padding: '2rem', textAlign: 'center' }}>
        No tienes permisos para ver ninguna base de datos.
      </div>
    );
  }

  const activeComponent = tabs.find(t => t.id === activeTab)?.component || tabs[0].component;

  return (
    <div className="bases-datos-page">
      <div className="v-glass-header" style={{ marginBottom: '1rem', paddingBottom: 0 }}>
        <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.5rem', fontWeight: '600', color: '#1e293b' }}>Bases de Datos</h2>
        <div className="bd-tabs">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`bd-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="bd-tab-icon">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      <div className="bd-tab-content">
        {activeComponent}
      </div>
    </div>
  );
}

export default BasesDatosPage;
