import React, { useState } from 'react';
import { usePermissions } from '../AppContext';
import Clientes from './Clientes';
import ProveedoresPage from './ProveedoresPage';
import ReferenciasPage from './ReferenciasPage';
import SedesZonasPage from './SedesZonasPage';
import { FaUsers, FaWarehouse, FaMapMarkerAlt, FaBoxes } from 'react-icons/fa';
import { Tabs, EmptyState } from '../components/ui';
import './BasesDatosPage.css';

function BasesDatosPage() {
  const hasPermission = usePermissions();

  const tabs = [];
  if (hasPermission('VER_CLIENTES')) tabs.push({ id: 'clientes', label: <><FaUsers /> Clientes</>, component: <Clientes /> });
  if (hasPermission('ADMINISTRAR_PROVEEDORES')) tabs.push({ id: 'proveedores', label: <><FaWarehouse /> Proveedores</>, component: <ProveedoresPage /> });
  if (hasPermission('ADMINISTRAR_REFERENCIAS')) tabs.push({ id: 'referencias', label: <><FaBoxes /> Referencias</>, component: <ReferenciasPage /> });
  if (hasPermission('ADMINISTRAR_SEDES')) tabs.push({ id: 'zonas', label: <><FaMapMarkerAlt /> Zonas y Sedes</>, component: <SedesZonasPage /> });

  const [activeTab, setActiveTab] = useState(tabs.length > 0 ? tabs[0].id : null);

  if (tabs.length === 0) {
    return (
      <div className="ds-page ds-fade-in">
        <EmptyState
          title="Sin acceso a bases de datos"
          message="No tienes permisos para ver ninguna base de datos."
        />
      </div>
    );
  }

  const activeComponent = tabs.find(t => t.id === activeTab)?.component || tabs[0].component;

  return (
    <div className="bases-datos-page ds-fade-in">
      <div className="bd-tabs-bar">
        <Tabs tabs={tabs} active={activeTab} onChange={setActiveTab} />
      </div>
      <div className="bd-tab-content">
        {activeComponent}
      </div>
    </div>
  );
}

export default BasesDatosPage;
