import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import './css/index.css';
import App from './components/Pages/App.tsx';
import Home from './components/Pages/Home.tsx';
import Settings from './components/Pages/Settings.tsx';
import VerifyEmail from './components/Pages/VerifyEmail.tsx';
import ErrorBoundary from './components/Layout/ErrorBoundary.tsx';
import SessionExpiredListener from './components/Layout/SessionExpiredListener.tsx';
import { setupGlobalLogging } from './utils/globalErrorLogging.ts';

setupGlobalLogging();

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <ErrorBoundary>
            <BrowserRouter>
                <SessionExpiredListener />
                <Routes>
                    <Route path="/" element={<App />} />
                    <Route path="/home" element={<Home />} />
                    <Route path="/ajustes" element={<Settings />} />
                    <Route path="/verificar-email" element={<VerifyEmail />} />
                </Routes>
            </BrowserRouter>
        </ErrorBoundary>
    </StrictMode>,
);
