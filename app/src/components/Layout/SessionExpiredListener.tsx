import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SESSION_EXPIRED_EVENT } from '../../api/authFetch';

// authFetch ya borro el token: solo falta volver al inicio.
function SessionExpiredListener() {
    const navigate = useNavigate();

    useEffect(() => {
        const handler = () => navigate('/', { replace: true });
        window.addEventListener(SESSION_EXPIRED_EVENT, handler);
        return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handler);
    }, [navigate]);

    return null;
}

export default SessionExpiredListener;
