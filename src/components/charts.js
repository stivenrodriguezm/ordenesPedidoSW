// Módulo de gráficos de carga perezosa: chart.js + react-chartjs-2 se importan
// aquí de forma estática, pero este módulo solo se carga vía `React.lazy` desde
// las páginas que muestran gráficos. El registro de Chart.js ocurre al cargar
// este chunk, garantizadamente antes del render de cualquier gráfico.
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler,
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

export { Bar, Line, Doughnut };
