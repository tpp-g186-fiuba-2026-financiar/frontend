// Logger del front. Escribe en la consola del navegador con un formato fijo
// ({ nivel, mensaje, ts, ruta, contexto }) y filtra por nivel: en dev muestra
// todo, en prod solo warn y error. VITE_LOG_LEVEL pisa el default.
//
// Nunca loguear el token, passwords ni codigos TOTP: el contexto pasa por
// redact() igual, por las dudas.

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
type LevelSetting = LogLevel | 'silent';

export type LogContext = Record<string, unknown>;

export interface LogEntry {
    nivel: LogLevel;
    mensaje: string;
    ts: string;
    ruta: string;
    contexto?: LogContext;
}

const ORDER: Record<LevelSetting, number> = {
    debug: 10,
    info: 20,
    warn: 30,
    error: 40,
    silent: 100,
};

const SENSITIVE_KEYS = new Set([
    'authorization',
    'token',
    'password',
    'totp_code',
    'secret',
    'otpauth_url',
    'qr_base64',
]);

const MAX_DEPTH = 4;

function isLevelSetting(value: unknown): value is LevelSetting {
    return typeof value === 'string' && value in ORDER;
}

function defaultLevel(): LevelSetting {
    const fromEnv = import.meta.env.VITE_LOG_LEVEL;
    if (isLevelSetting(fromEnv)) return fromEnv;
    return import.meta.env.DEV ? 'debug' : 'warn';
}

let currentLevel: LevelSetting = defaultLevel();

export function setLogLevel(level: LevelSetting) {
    currentLevel = level;
}

export function getLogLevel(): LevelSetting {
    return currentLevel;
}

export function redact(value: unknown, depth = 0): unknown {
    if (value === null || typeof value !== 'object') return value;
    if (depth >= MAX_DEPTH) return '[...]';
    if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));
    const out: Record<string, unknown> = {};
    for (const [key, v] of Object.entries(value)) {
        out[key] = SENSITIVE_KEYS.has(key.toLowerCase())
            ? '[oculto]'
            : redact(v, depth + 1);
    }
    return out;
}

function emit(nivel: LogLevel, mensaje: string, contexto?: LogContext) {
    if (ORDER[nivel] < ORDER[currentLevel]) return;
    const entry: LogEntry = {
        nivel,
        mensaje,
        ts: new Date().toISOString(),
        ruta: window.location.pathname,
    };
    if (contexto) entry.contexto = redact(contexto) as LogContext;
    console[nivel](`[FinanciAr] ${mensaje}`, entry);
}

export const logger = {
    debug: (mensaje: string, contexto?: LogContext) =>
        emit('debug', mensaje, contexto),
    info: (mensaje: string, contexto?: LogContext) =>
        emit('info', mensaje, contexto),
    warn: (mensaje: string, contexto?: LogContext) =>
        emit('warn', mensaje, contexto),
    error: (mensaje: string, contexto?: LogContext) =>
        emit('error', mensaje, contexto),
};

export default logger;
