import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import './css/index.css';
import App from './components/Pages/App.tsx';
import Home from './components/Pages/Home.tsx';
import Settings from './components/Pages/Settings.tsx';
import VerifyEmail from './components/Pages/VerifyEmail.tsx';
import RestorePassword from './components/Pages/RestorePassword.tsx';
import RequireAuth from './components/Layout/RequireAuth.tsx';
import RedirectIfAuthenticated from './components/Layout/RedirectIfAuthenticated.tsx';

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
                <Route
                    path="/home"
                    element={
                        <RequireAuth>
                            <Home />
                        </RequireAuth>
                    }
                />
                <Route
                    path="/ajustes"
                    element={
                        <RequireAuth>
                            <Settings />
                        </RequireAuth>
                    }
                />
                <Route path="/verificar-email" element={<VerifyEmail />} />
                <Route path="/restore-password" element={<RestorePassword />} />
            </Routes>
        </BrowserRouter>
    </StrictMode>,
);
