with open('src/pages/OrdenesPage.jsx', 'r') as f:
    content = f.read()

# 1. Add selectedExhibicion state
content = content.replace(
    "  const [selectedEstado, setSelectedEstado] = useState('en_proceso');",
    "  const [selectedEstado, setSelectedEstado] = useState('en_proceso');\n  const [selectedExhibicion, setSelectedExhibicion] = useState('');"
)

# 2. Add es_exhibicion to fetchOrdenes params
content = content.replace(
    "        const params = {\n          id_proveedor: selectedProveedor,\n          id_vendedor: selectedVendedor,\n          estado: selectedEstado,\n          ordering: '-id',\n        };",
    "        const params = {\n          id_proveedor: selectedProveedor,\n          id_vendedor: selectedVendedor,\n          estado: selectedEstado,\n          es_exhibicion: selectedExhibicion,\n          ordering: '-id',\n        };"
)

# 3. Add selectedExhibicion to the useEffect dependency array
content = content.replace(
    "  }, [selectedProveedor, selectedVendedor, selectedEstado, token, user]);",
    "  }, [selectedProveedor, selectedVendedor, selectedEstado, selectedExhibicion, token, user]);"
)

# 4. Add Exh. filter select in the filters bar (after the estado select)
old_filters_end = '''          <div className="o-select-pill">
            <select value={selectedEstado} onChange={(e) => { setSelectedEstado(e.target.value); }}>
              {estados.map((estado) => (<option key={estado.value} value={estado.value}>{estado.label === 'Todos' ? 'Estado: Todos' : estado.label}</option>))}
            </select>
          </div>
        </div>'''

new_filters_end = '''          <div className="o-select-pill">
            <select value={selectedEstado} onChange={(e) => { setSelectedEstado(e.target.value); }}>
              {estados.map((estado) => (<option key={estado.value} value={estado.value}>{estado.label === 'Todos' ? 'Estado: Todos' : estado.label}</option>))}
            </select>
          </div>
          <div className="o-select-pill">
            <select value={selectedExhibicion} onChange={(e) => { setSelectedExhibicion(e.target.value); }}>
              <option value="">Exhibición: Todos</option>
              <option value="true">Sí (Exhibición)</option>
              <option value="false">No (Exhibición)</option>
            </select>
          </div>
        </div>'''

content = content.replace(old_filters_end, new_filters_end)

# 5. Add Exh. column header (after Observación, before Costo)
old_th = '''                <th className="th-observacion">Observación</th>
                {(user?.role.toLowerCase() === 'administrador' || user?.role.toLowerCase() === 'auxiliar') && <th className="th-costo">Costo</th>}'''

new_th = '''                <th className="th-observacion">Observación</th>
                <th className="th-exh" title="¿Es para exhibición?">Exh.</th>
                {(user?.role.toLowerCase() === 'administrador' || user?.role.toLowerCase() === 'auxiliar') && <th className="th-costo">Costo</th>}'''

content = content.replace(old_th, new_th)

# 6. Add Exh. column cell (after observacion td, before costo td)
old_td = '''                      <td className="td-observacion"><div className="truncate-text" title={orden.observacion}>{orden.observacion}</div></td>
                      {(user?.role.toLowerCase() === 'administrador' || user?.role.toLowerCase() === 'auxiliar') && <td className="td-costo font-mono">${formatNumber(orden.costo)}</td>}'''

new_td = '''                      <td className="td-observacion"><div className="truncate-text" title={orden.observacion}>{orden.observacion}</div></td>
                      <td className="td-exh">{orden.es_exhibicion ? <span className="exh-badge exh-si">Sí</span> : <span className="exh-badge exh-no">No</span>}</td>
                      {(user?.role.toLowerCase() === 'administrador' || user?.role.toLowerCase() === 'auxiliar') && <td className="td-costo font-mono">${formatNumber(orden.costo)}</td>}'''

content = content.replace(old_td, new_td)

# 7. Update colSpan counts (add 1 for the new Exh. column: admin=12, vendedor=11)
content = content.replace(
    "<td colSpan={user?.role.toLowerCase() === 'administrador' || user?.role.toLowerCase() === 'auxiliar' ? 11 : 10}>",
    "<td colSpan={user?.role.toLowerCase() === 'administrador' || user?.role.toLowerCase() === 'auxiliar' ? 12 : 11}>"
)
content = content.replace(
    '<tr><td colSpan={11} className="empty-cell">No hay órdenes para mostrar.</td></tr>',
    '<tr><td colSpan={12} className="empty-cell">No hay órdenes para mostrar.</td></tr>'
)
content = content.replace(
    '<tr><td colSpan={11}><div className="loading-container"><div className="loader"></div></div></td></tr>',
    '<tr><td colSpan={12}><div className="loading-container"><div className="loader"></div></div></td></tr>'
)

with open('src/pages/OrdenesPage.jsx', 'w') as f:
    f.write(content)
print('OrdenesPage.jsx updated')
