import { HashRouter, Route, Routes } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { DataProvider } from './hooks/useData';
import { Login } from './pages/Login';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { MapPage } from './pages/MapPage';
import { Loading } from './components/ui';
import { EntityList } from './pages/EntityList';
import { RecordDetail } from './pages/RecordDetail';
import { UsersPage, AuditPage, SettingsPage } from './pages/Admin';
function PrivateApp() {
  const { profile, loading, recovery } = useAuth();
  if (loading) return <Loading />;
  if (!profile || recovery) return <Login />;
  return (
    <DataProvider>
      <HashRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Dashboard />} />
            {(['drivers', 'vehicles', 'reports'] as const).map((entity) => (
              <Route key={entity} path={entity}>
                <Route index element={<EntityList key={entity} entity={entity} />} />
                <Route path=":id" element={<RecordDetail key={entity} entity={entity} />} />
              </Route>
            ))}
            <Route path="map" element={<MapPage />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="audit" element={<AuditPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route
              path="*"
              element={
                <div className="empty">
                  <h2>Página no encontrada</h2>
                  <a href="#/">Volver al resumen</a>
                </div>
              }
            />
          </Route>
        </Routes>
      </HashRouter>
    </DataProvider>
  );
}
export default function App() {
  return (
    <AuthProvider>
      <PrivateApp />
      <Toaster theme="dark" richColors closeButton position="top-right" />
    </AuthProvider>
  );
}
