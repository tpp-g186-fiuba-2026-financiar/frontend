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

authAxios.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

authAxios.interceptors.response.use(undefined, (error) => {
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
