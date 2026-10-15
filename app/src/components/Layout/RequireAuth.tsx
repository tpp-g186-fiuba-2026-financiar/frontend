import { useEffect, type ReactNode } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { SESSION_EXPIRED_EVENT } from '../../api/authFetch';
import type { LandingState } from '../Pages/App';

interface RequireAuthProps {
    children: ReactNode;
}

// Sin token se vuelve al inicio (pre login). Se reenvia el estado de la
// navegacion para que, p. ej., /restore-password pueda abrir el login. Si la
// sesion vence mientras se usa la pantalla, se vuelve al inicio con el login
// abierto.
function RequireAuth({ children }: RequireAuthProps) {
    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        const onSessionExpired = () => {
            const state: LandingState = {
                login: 'login',
                sessionExpired: true,
            };
            navigate('/', { replace: true, state });
        };
        window.addEventListener(SESSION_EXPIRED_EVENT, onSessionExpired);
        return () =>
            window.removeEventListener(SESSION_EXPIRED_EVENT, onSessionExpired);
    }, [navigate]);

    if (!localStorage.getItem('token')) {
        return <Navigate to="/" replace state={location.state} />;
    }
    return <>{children}</>;
}

export default RequireAuth;
