import axios from 'axios';
import authAxios from '../authFetch';

const BASE = import.meta.env.VITE_SERVER_API + '/user/2fa';

export interface TwoFactorSetupResponse {
    code: number;
    secret: string;
    otpauth_url: string;
    qr_base64: string;
}

export async function setupTwoFactorEndpoint(): Promise<TwoFactorSetupResponse> {
    const res = await authAxios.post(`${BASE}/setup`);
    return res.data;
}

// enable/disable devuelven 400 con { message } cuando el codigo es invalido;
// devolvemos el mensaje en vez de propagar la excepcion de axios.
async function postCode(
    action: 'enable' | 'disable',
    code: string,
): Promise<{ ok: boolean; message: string }> {
    try {
        const res = await authAxios.post(`${BASE}/${action}`, { code });
        return { ok: true, message: res.data.message };
    } catch (err) {
        if (axios.isAxiosError(err) && err.response?.data?.message) {
            return { ok: false, message: err.response.data.message };
        }
        return { ok: false, message: 'No se pudo completar la operación' };
    }
}

export const enableTwoFactorEndpoint = (code: string) =>
    postCode('enable', code);
export const disableTwoFactorEndpoint = (code: string) =>
    postCode('disable', code);
