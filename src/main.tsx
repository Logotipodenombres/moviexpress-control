import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import { toast } from 'sonner';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import 'leaflet/dist/leaflet.css';
import './styles.css';
const update = registerSW({
  onNeedRefresh() {
    toast('Hay una nueva versión disponible.', {
      duration: Infinity,
      action: { label: 'Actualizar', onClick: () => void update(true) },
    });
  },
});
createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);
