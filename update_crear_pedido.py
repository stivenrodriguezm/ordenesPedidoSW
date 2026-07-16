import sys

# =========================================================
# 1. CrearPedidoPage.jsx - Add es_exhibicion + useLocation
# =========================================================
with open('src/pages/CrearPedidoPage.jsx', 'r') as f:
    content = f.read()

# Add useLocation import
content = content.replace(
    'import { useNavigate } from "react-router-dom";',
    'import { useNavigate, useLocation } from "react-router-dom";'
)

# Add useLocation hook and read ventaId from state
content = content.replace(
    '  const navigate = useNavigate();\n  const token = localStorage.getItem("accessToken");',
    '  const navigate = useNavigate();\n  const location = useLocation();\n  const initialVentaId = location.state?.ventaId || "";\n  const token = localStorage.getItem("accessToken");'
)

# Pre-fill ordenCompra with ventaId from navigation state
content = content.replace(
    '    ordenCompra: "",',
    '    ordenCompra: initialVentaId,'
)

# Add esExhibicion state
content = content.replace(
    '  const [llevaTela, setLlevaTela] = useState(false);',
    '  const [llevaTela, setLlevaTela] = useState(false);\n  const [esExhibicion, setEsExhibicion] = useState(false);'
)

# Include es_exhibicion in the mutation payload
content = content.replace(
    '      tela: llevaTela ? "Por pedir" : "Sin tela",\n      venta: pedido.ordenCompra ? parseInt(pedido.ordenCompra) : null,',
    '      tela: llevaTela ? "Por pedir" : "Sin tela",\n      venta: pedido.ordenCompra ? parseInt(pedido.ordenCompra) : null,\n      es_exhibicion: esExhibicion,'
)

# Add the checkbox after "se debe pedir tela"
old_checkbox = '''            <div className="form-group checkbox-group">
              <input id="llevaTela" type="checkbox" checked={llevaTela} onChange={(e) => setLlevaTela(e.target.checked)} />
              <label htmlFor="llevaTela">¿Se debe pedir tela?</label>
            </div>'''

new_checkbox = '''            <div className="form-group checkbox-group">
              <input id="llevaTela" type="checkbox" checked={llevaTela} onChange={(e) => setLlevaTela(e.target.checked)} />
              <label htmlFor="llevaTela">¿Se debe pedir tela?</label>
            </div>
            <div className="form-group checkbox-group">
              <input id="esExhibicion" type="checkbox" checked={esExhibicion} onChange={(e) => setEsExhibicion(e.target.checked)} />
              <label htmlFor="esExhibicion">¿Es para exhibición?</label>
            </div>'''

content = content.replace(old_checkbox, new_checkbox)

with open('src/pages/CrearPedidoPage.jsx', 'w') as f:
    f.write(content)
print('CrearPedidoPage.jsx updated')
