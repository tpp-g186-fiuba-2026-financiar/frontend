import axios from 'axios';
import { backendMessage } from './errors';

const BASE = import.meta.env.VITE_SERVER_API + '/verify-email';

export interface VerifyEmailResult {
    ok: boolean;
    message: string;
}

// El back responde 400 cuando el token es invalido o vencio; devolvemos el
// resultado en vez de propagar la excepcion de axios.
export async function verifyEmailEndpoint(
    token: string,
): Promise<VerifyEmailResult> {
    try {
        const res = await axios.post(BASE, { token });
        return { ok: true, message: res.data.message };
    } catch (err) {
        return {
            ok: false,
            message: backendMessage(err) ?? 'No se pudo verificar la cuenta',
        };
    }
}

// Siempre responde lo mismo (exista o no la cuenta), asi que solo importa si
// el pedido llego bien.
export async function resendVerificationEndpoint(
    email: string,
): Promise<boolean> {
    try {
        await axios.post(`${BASE}/resend`, { email });
        return true;
    } catch {
        return false;
    }
}
