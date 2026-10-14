import axios from 'axios';
import logger from '../utils/logger';
import { attachHttpLogging } from './httpLogging';

const authAxios = axios.create();
attachHttpLogging(authAxios);

// El back corta con 403 las rutas que necesitan perfil de riesgo cuando el
// usuario no tiene uno o ya vencio (dura un año). Se avisa con un evento
// global para que la pantalla abra el cuestionario, y el error sigue su curso.
export const RISK_PROFILE_EVENT = 'financiar:risk-profile-required';
export type RiskProfileReason = 'expired' | 'required';

// El back responde 401 cuando el token no sirve (vencido o invalido). Se borra
// y se avisa con un evento global para volver al inicio, en vez de que cada
// pantalla muestre su propio "no se pudo cargar".
export const SESSION_EXPIRED_EVENT = 'financiar:session-expired';

const RISK_PROFILE_ERRORS: Record<string, RiskProfileReason> = {
    RISK_PROFILE_EXPIRED: 'expired',
    RISK_PROFILE_REQUIRED: 'required',
};

authAxios.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

authAxios.interceptors.response.use(undefined, (error) => {
    if (error?.response?.status === 401 && localStorage.getItem('token')) {
        logger.info('Sesion vencida o invalida, se vuelve al inicio');
        localStorage.removeItem('token');
        window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT));
        return Promise.reject(error);
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
