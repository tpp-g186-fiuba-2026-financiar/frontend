import axios from 'axios';

const authAxios = axios.create();

// El back corta con 403 las rutas que necesitan perfil de riesgo cuando el
// usuario no tiene uno o ya vencio (dura un año). Se avisa con un evento
// global para que la pantalla abra el cuestionario, y el error sigue su curso.
export const RISK_PROFILE_EVENT = 'financiar:risk-profile-required';
export type RiskProfileReason = 'expired' | 'required';

const RISK_PROFILE_ERRORS: Record<string, RiskProfileReason> = {
    RISK_PROFILE_EXPIRED: 'expired',
    RISK_PROFILE_REQUIRED: 'required',
};

// El back responde 401 en las rutas protegidas solo cuando el JWT falta, es
// invalido o vencio: se borra el token y se avisa con un evento global para
// que la pantalla vuelva al inicio (ver RequireAuth).
export const SESSION_EXPIRED_EVENT = 'financiar:session-expired';

authAxios.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

authAxios.interceptors.response.use(undefined, (error) => {
    if (error?.response?.status === 401 && localStorage.getItem('token')) {
        localStorage.removeItem('token');
        window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    }
    const reason =
        error?.response?.status === 403
            ? RISK_PROFILE_ERRORS[error.response.data?.error]
            : undefined;
    if (reason) {
        window.dispatchEvent(
            new CustomEvent<RiskProfileReason>(RISK_PROFILE_EVENT, {
                detail: reason,
            }),
        );
    }
    return Promise.reject(error);
});

export default authAxios;
