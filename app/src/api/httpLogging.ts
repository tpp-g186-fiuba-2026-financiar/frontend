import axios, {
    type AxiosInstance,
    type InternalAxiosRequestConfig,
} from 'axios';
import logger from '../utils/logger';
import { describeError, stripQuery } from './errors';

// Interceptores que loguean cada request: debug si sale bien, warn para 4xx y
// error para 5xx o fallas de red. Se instalan sobre el axios global (llamadas
// publicas: login, register, collector...) y sobre authAxios, que es una
// instancia aparte y no hereda los interceptores del global.

type TimedConfig = InternalAxiosRequestConfig & { startedAt?: number };

function elapsed(config: TimedConfig | undefined): number | undefined {
    if (config?.startedAt === undefined) return undefined;
    return Math.round(performance.now() - config.startedAt);
}

export function attachHttpLogging(instance: AxiosInstance) {
    instance.interceptors.request.use((config: TimedConfig) => {
        config.startedAt = performance.now();
        return config;
    });

    instance.interceptors.response.use(
        (response) => {
            const config = response.config as TimedConfig;
            logger.debug('HTTP ok', {
                metodo: config.method?.toUpperCase(),
                url: stripQuery(config.url),
                status: response.status,
                ms: elapsed(config),
            });
            return response;
        },
        (error) => {
            // Request cancelado a proposito (AbortController): no es una falla.
            if (axios.isCancel(error)) return Promise.reject(error);
            const info = {
                ...describeError(error),
                ms: elapsed(error?.config as TimedConfig | undefined),
            };
            const status = error?.response?.status as number | undefined;
            if (status !== undefined && status < 500) {
                logger.warn('HTTP fallo', info);
            } else {
                logger.error('HTTP fallo', info);
            }
            return Promise.reject(error);
        },
    );
}
