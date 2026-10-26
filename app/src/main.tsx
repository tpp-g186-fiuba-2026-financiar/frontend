import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import './css/base.css';
import './css/index.css';
import './css/next.css';
import App from './components/Pages/App.tsx';
import VerifyEmail from './components/Pages/VerifyEmail.tsx';
import RestorePassword from './components/Pages/RestorePassword.tsx';
import RequireAuth from './components/Layout/RequireAuth.tsx';
import RedirectIfAuthenticated from './components/Layout/RedirectIfAuthenticated.tsx';
import { AppRoutes } from './next/routes.tsx';

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <BrowserRouter>
            <Routes>
                <Route
                    path="/"
                    element={
                        <RedirectIfAuthenticated>
                            <App />
                        </RedirectIfAuthenticated>
                    }
                />
                <Route path="/verificar-email" element={<VerifyEmail />} />
                <Route path="/restore-password" element={<RestorePassword />} />
                {AppRoutes(RequireAuth)}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </BrowserRouter>
    </StrictMode>,
);
