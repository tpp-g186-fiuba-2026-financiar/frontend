import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';

interface RedirectIfAuthenticatedProps {
    children: ReactNode;
}

// Con sesion iniciada, las pantallas pre login (el inicio) mandan a /home.
function RedirectIfAuthenticated({ children }: RedirectIfAuthenticatedProps) {
    if (localStorage.getItem('token')) {
        return <Navigate to="/home" replace />;
    }
    return <>{children}</>;
}

export default RedirectIfAuthenticated;
