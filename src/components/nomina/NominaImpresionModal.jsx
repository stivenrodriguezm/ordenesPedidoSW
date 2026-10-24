import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Modal } from '../ui';
import BotonImprimir from '../impresion/BotonImprimir';
import { hojaNomina } from '../../utils/nominaImpresion';
import '../RemisionPrintModal.css';

// Hoja carta a 96 px por pulgada (como la remisión): la vista previa es el mismo
// documento que se imprime, dentro de un iframe a escala, con el mismo zoom
// "Hoja completa / 100 %" de Remisiones.
const HOJA_ANCHO = 816;
const HOJA_ALTO = 1056;

export default function NominaImpresionModal({ cierre, asesor, onClose }) {
    const frame = useRef(null);
    const visor = useRef(null);
    const [lista, setLista] = useState(false);
    const [alto, setAlto] = useState(HOJA_ALTO);
    const [espacio, setEspacio] = useState(null);
    const [zoom, setZoom] = useState('hoja'); // 'hoja' = hoja completa, 'real' = 100 %
    const html = useMemo(() => hojaNomina(cierre, asesor), [cierre, asesor]);

    useEffect(() => {
        const el = visor.current;
        if (!el || typeof ResizeObserver === 'undefined') return undefined;
        const ro = new ResizeObserver(([e]) => setEspacio({ w: e.contentRect.width, h: e.contentRect.height }));
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    const alCargar = () => {
        const doc = frame.current?.contentDocument;
        if (!doc?.body) return;
        setAlto(Math.max(HOJA_ALTO, Math.ceil(doc.documentElement.scrollHeight)));
        setLista(true);
    };
    const imprimir = () => {
        const win = frame.current?.contentWindow;
        if (!win || !lista) return;
        win.focus();
        win.print();
    };
    const escalaHoja = espacio ? Math.min(espacio.w / HOJA_ANCHO, espacio.h / HOJA_ALTO, 1) : 0.6;
    const escala = zoom === 'real' ? 1 : escalaHoja;
    const hojas = Math.max(1, Math.ceil(alto / HOJA_ALTO));

    return (
        <Modal open onClose={onClose} title={`Imprimir nómina · ${asesor.nombre}`} size="xl" className="rpm-modal"
            footer={<>
                <div className="rpm-info">
                    <div className="rpm-zoom" role="group" aria-label="Tamaño de la vista previa">
                        <button type="button" className={zoom === 'hoja' ? 'is-active' : ''} onClick={() => setZoom('hoja')}>Hoja completa</button>
                        <button type="button" className={zoom === 'real' ? 'is-active' : ''} onClick={() => setZoom('real')}>100 %</button>
                    </div>
                    <span className="rpm-paper">Carta · {hojas} hoja{hojas === 1 ? '' : 's'}</span>
                </div>
                <Button variant="secondary" onClick={onClose}>Cerrar</Button>
                <BotonImprimir documento={() => html} titulo={`Nómina · ${asesor.nombre}`} imprimirLocal={imprimir} disabled={!lista} />
            </>}>
            <div className="rpm-visor" ref={visor}>
                <div className={`rpm-hoja${lista ? '' : ' is-cargando'}${zoom === 'hoja' ? ' is-reducida' : ''}`}
                    style={{ width: HOJA_ANCHO * escala, height: alto * escala }}
                    onClick={() => setZoom(z => (z === 'hoja' ? 'real' : 'hoja'))}
                    title={zoom === 'hoja' ? 'Clic para ver al 100 %' : 'Clic para ver la hoja completa'}>
                    <iframe ref={frame} className="rpm-frame" title="Vista previa de la nómina" srcDoc={html} onLoad={alCargar} tabIndex={-1}
                        style={{ width: HOJA_ANCHO, height: alto, transform: `scale(${escala})` }} />
                </div>
            </div>
        </Modal>
    );
}
