import axios from 'axios';

const BASE = import.meta.env.VITE_SERVER_API;

export interface ResetPasswordResult {
    ok: boolean;
    message: string;
}

// Siempre responde lo mismo (exista o no la cuenta), asi que solo importa si
// el pedido llego bien.
export async function forgotPasswordEndpoint(email: string): Promise<boolean> {
    try {
        await axios.post(`${BASE}/forgot-password`, { email });
        return true;
    } catch {
        return false;
    }
}

// El back responde 400 cuando el token es invalido o vencio, o cuando la
// contrasena no cumple los requisitos; devolvemos el resultado en vez de
// propagar la excepcion de axios.
export async function resetPasswordEndpoint(
    token: string,
    newPassword: string,
): Promise<ResetPasswordResult> {
    try {
        const res = await axios.post(`${BASE}/reset-password`, {
            token,
            new_password: newPassword,
        });
        return { ok: true, message: res.data.message };
    } catch (err) {
        if (axios.isAxiosError(err) && err.response?.data?.message) {
            return { ok: false, message: err.response.data.message };
        }
        return { ok: false, message: '' };
    }
}
