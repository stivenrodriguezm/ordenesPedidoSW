import sys

with open('src/pages/OrdenesPage.jsx', 'r') as f:
    content = f.read()

old_header = '''      <div className="page-header">
        <div className="filters-group">
          <select value={selectedProveedor} onChange={(e) => { setSelectedProveedor(e.target.value); }} disabled={isLoadingProveedores}>
            <option value="">{isLoadingProveedores ? "Cargando proveedores..." : "Todos los proveedores"}</option>
            {!isLoadingProveedores && Array.isArray(proveedores) && proveedores.map((prov) => (<option key={prov.id} value={prov.id}>{prov.nombre_empresa}</option>))}
          </select>
          {(user?.role === 'administrador' || user?.role === 'auxiliar') && (
            <select value={selectedVendedor} onChange={(e) => { setSelectedVendedor(e.target.value); }}>
              <option value="">Todos los vendedores</option>
              {vendedores.map((vendedor) => (<option key={vendedor.id} value={vendedor.id}>{vendedor.first_name}</option>))}
            </select>
          )}
          <select value={selectedEstado} onChange={(e) => { setSelectedEstado(e.target.value); }}>
            {estados.map((estado) => (<option key={estado.value} value={estado.value}>{estado.label}</option>))}
          </select>
        </div>
        <div className="actions-group">
          {(user?.role === 'administrador' || user?.role === 'auxiliar') && <button className="btn-secondary" onClick={exportOrdenes}><FaFileExport /> Exportar</button>}
          <button className="btn-primary" onClick={() => navigate('/ordenes/nuevo')}><FaPlus /> Crear Pedido</button>
        </div>
      </div>'''

new_header = '''      <div className="o-glass-header" style={{ display: 'flex', flexWrap: 'nowrap', gap: '0.5rem', justifyContent: 'space-between', alignItems: 'center', overflowX: 'auto' }}>
        <div className="o-filters-bar" style={{ margin: 0, flex: 1 }}>
          <div className="o-select-pill">
            <select value={selectedProveedor} onChange={(e) => { setSelectedProveedor(e.target.value); }} disabled={isLoadingProveedores}>
              <option value="">{isLoadingProveedores ? "Cargando proveedores..." : "Proveedor: Todos"}</option>
              {!isLoadingProveedores && Array.isArray(proveedores) && proveedores.map((prov) => (<option key={prov.id} value={prov.id}>{prov.nombre_empresa}</option>))}
            </select>
          </div>
          {(user?.role === 'administrador' || user?.role === 'auxiliar') && (
            <div className="o-select-pill">
              <select value={selectedVendedor} onChange={(e) => { setSelectedVendedor(e.target.value); }}>
                <option value="">Vendedor: Todos</option>
                {vendedores.map((vendedor) => (<option key={vendedor.id} value={vendedor.id}>{vendedor.first_name}</option>))}
              </select>
            </div>
          )}
          <div className="o-select-pill">
            <select value={selectedEstado} onChange={(e) => { setSelectedEstado(e.target.value); }}>
              {estados.map((estado) => (<option key={estado.value} value={estado.value}>{estado.label === 'Todos' ? 'Estado: Todos' : estado.label}</option>))}
            </select>
          </div>
        </div>

        <div className="header-actions" style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {(user?.role === 'administrador' || user?.role === 'auxiliar') && (
            <button className="o-btn-ghost" onClick={exportOrdenes} title="Exportar Excel">
              <FaFileExport />
            </button>
          )}
          <button className="o-btn-primary-glow" onClick={() => navigate('/ordenes/nuevo')}>
            <FaPlus />
            <span className="long-text">Crear Pedido</span>
            <span className="short-text">Crear</span>
          </button>
        </div>
      </div>'''

content = content.replace(old_header, new_header)

with open('src/pages/OrdenesPage.jsx', 'w') as f:
    f.write(content)
