import axios from 'axios';

// Resumen de un error para loguear: si es de axios trae el request y lo que
// contesto el back; nunca incluye headers ni el body enviado.
export type ErrorInfo = {
    mensaje: string;
    nombre?: string;
    status?: number;
    metodo?: string;
    url?: string;
    code?: string;
    mensajeBack?: string;
    codigoBack?: string;
};

// Saca el query string: no hace falta para diagnosticar y puede traer datos.
export function stripQuery(url: string | undefined): string | undefined {
    return url?.split('?')[0];
}

function backendField(
    err: unknown,
    field: 'message' | 'error',
): string | undefined {
    if (!axios.isAxiosError(err)) return undefined;
    const value = (err.response?.data as Record<string, unknown> | undefined)?.[
        field
    ];
    return typeof value === 'string' ? value : undefined;
}

// Mensaje legible que manda el back en el body del error ({ message }), apto
// para mostrar al usuario. El campo `error` es un codigo (p. ej.
// RISK_PROFILE_REQUIRED) y solo va al log.
export function backendMessage(err: unknown): string | undefined {
    return backendField(err, 'message');
}

export function describeError(err: unknown): ErrorInfo {
    if (axios.isAxiosError(err)) {
        const info: ErrorInfo = { mensaje: err.message };
        if (err.response?.status) info.status = err.response.status;
        if (err.config?.method) info.metodo = err.config.method.toUpperCase();
        const url = stripQuery(err.config?.url);
        if (url) info.url = url;
        if (err.code) info.code = err.code;
        const fromBack = backendMessage(err);
        if (fromBack) info.mensajeBack = fromBack;
        const codeBack = backendField(err, 'error');
        if (codeBack) info.codigoBack = codeBack;
        return info;
    }
    if (err instanceof Error) {
        return { mensaje: err.message, nombre: err.name };
    }
    return { mensaje: String(err) };
}
