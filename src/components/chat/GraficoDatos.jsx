import React, { useRef } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement, LineElement, ArcElement, Tooltip, Legend } from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import './GraficoDatos.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, ArcElement, Tooltip, Legend);
const COLORES = ['#4f46e5', '#0d9488', '#d97706', '#db2777', '#0284c7', '#7c3aed', '#65a30d', '#c2410c', '#475569', '#a21caf'];
const TIPOS = { barras: Bar, lineas: Line, dona: Doughnut };

export default function GraficoDatos({ grafico: g }) {
    const ref = useRef(null);
    const Componente = TIPOS[g?.tipo];
    if (!Componente || !Array.isArray(g.etiquetas) || !Array.isArray(g.valores) || g.etiquetas.length !== g.valores.length || g.valores.length > 50 || !g.valores.length
        || g.valores.some(v => v !== null && (typeof v !== 'number' || !Number.isFinite(v)))) return null;
    const formato = n => n == null ? 'Sin dato' : new Intl.NumberFormat('es-CO', g.unidad === 'COP'
        ? { style: 'currency', currency: 'COP', maximumFractionDigits: 2 } : { maximumFractionDigits: 2 }).format(n) + (g.unidad === '%' ? ' %' : '');
    const horizontal = g.tipo === 'barras';
    const datos = { labels: g.etiquetas, datasets: [{ label: g.titulo, data: g.valores,
        backgroundColor: g.tipo === 'dona' ? COLORES : (g.color || '#4f46e5'), borderColor: g.color || '#4f46e5', borderWidth: g.tipo === 'lineas' ? 2 : 0,
        borderRadius: g.tipo === 'barras' ? 4 : undefined, tension: 0, spanGaps: false }] };
    const opciones = {
        responsive: true, maintainAspectRatio: false, animation: false,
        indexAxis: horizontal ? 'y' : 'x',
        plugins: { legend: { display: g.tipo === 'dona', position: 'bottom' }, tooltip: { callbacks: { label: ctx => formato(g.valores[ctx.dataIndex]) } } },
        ...(g.tipo !== 'dona' ? { scales: { [horizontal ? 'x' : 'y']: { beginAtZero: true, ticks: { callback: n => formato(n) } } } } : {}),
    };
    const descargar = () => {
        const url = ref.current?.toBase64Image();
        if (!url) return;
        const enlace = document.createElement('a'); enlace.href = url; enlace.download = 'lottus-grafico.png'; enlace.click();
    };
    return <figure className="chat-grafico">
        <figcaption><strong>{g.titulo}</strong><span>{g.unidad} · Fuente: ERP / {g.fuente}</span></figcaption>
        <div className="chat-grafico__canvas" style={{ height: horizontal ? Math.max(250, g.etiquetas.length * 30) : 300 }}>
            <Componente ref={ref} data={datos} options={opciones} role="img" aria-label={`${g.titulo}. Valores disponibles en la tabla.`} />
        </div>
        {!!Object.keys(g.filtros || {}).length && <p className="chat-grafico__filtros">{Object.entries(g.filtros).map(([k, v]) => `${k}: ${v}`).join(' · ')}</p>}
        {g.nota && <p className="chat-grafico__nota">{g.nota}</p>}
        <div className="chat-grafico__acciones">
            <details><summary>Ver datos del gráfico</summary><div className="chat-grafico__tabla"><table>
                <thead><tr><th>Grupo</th><th>{g.titulo} ({g.unidad})</th></tr></thead>
                <tbody>{g.etiquetas.map((e, i) => <tr key={i}><th scope="row">{e}</th><td>{formato(g.valores[i])}</td></tr>)}</tbody>
            </table></div></details>
            <button type="button" onClick={descargar}>Descargar PNG</button>
        </div>
    </figure>;
}
