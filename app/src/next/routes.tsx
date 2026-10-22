import { lazy, type ComponentType, type ReactNode } from 'react';
import { Navigate, Route } from 'react-router-dom';
import { UiProvider } from './data/UiContext';
import { PortfolioProvider } from './data/PortfolioContext';
import AppShell from './shell/AppShell';

// Cada página se descarga recién cuando se abre.
const Resumen = lazy(() => import('./pages/Resumen'));
const Cartera = lazy(() => import('./pages/Cartera'));
const Accion = lazy(() => import('./pages/Accion'));
const Rebalanceo = lazy(() => import('./pages/Rebalanceo'));
const Historial = lazy(() => import('./pages/Historial'));
const Riesgo = lazy(() => import('./pages/Riesgo'));
const Mercado = lazy(() => import('./pages/Mercado'));
const Terminal = lazy(() => import('./pages/Terminal'));
const Alertas = lazy(() => import('./pages/Alertas'));
const Ajustes = lazy(() => import('./pages/Ajustes'));
const Arquitectura = lazy(() => import('./pages/admin/Arquitectura'));
const Servicios = lazy(() => import('./pages/admin/Servicios'));
const Modelos = lazy(() => import('./pages/admin/Modelos'));
const Confiabilidad = lazy(() => import('./pages/admin/Confiabilidad'));

// Rutas de la app logueada: un layout (shell) con las páginas adentro. El
// panel de administración usa el mismo shell en modo admin, que redirige a
// /home si el usuario no tiene rol de administrador.
export function AppRoutes(RequireAuth: ComponentType<{ children: ReactNode }>) {
    const shell = (admin: boolean) => (
        <RequireAuth>
            <UiProvider>
                <PortfolioProvider>
                    <AppShell admin={admin} />
                </PortfolioProvider>
            </UiProvider>
        </RequireAuth>
    );
    return (
        <>
            <Route element={shell(false)}>
                <Route path="/home" element={<Resumen />} />
                <Route path="/cartera" element={<Cartera />} />
                <Route path="/accion" element={<Accion />} />
                <Route path="/accion/:ticker" element={<Accion />} />
                <Route path="/rebalanceo" element={<Rebalanceo />} />
                <Route path="/historial" element={<Historial />} />
                <Route path="/riesgo" element={<Riesgo />} />
                <Route path="/mercado" element={<Mercado />} />
                <Route path="/terminal" element={<Terminal />} />
                <Route path="/alertas" element={<Alertas />} />
                <Route path="/ajustes" element={<Ajustes />} />
            </Route>
            <Route path="/admin" element={shell(true)}>
                <Route index element={<Navigate to="arquitectura" replace />} />
                <Route path="arquitectura" element={<Arquitectura />} />
                <Route path="servicios" element={<Servicios />} />
                <Route path="modelos" element={<Modelos />} />
                <Route path="confiabilidad" element={<Confiabilidad />} />
            </Route>
        </>
    );
}
