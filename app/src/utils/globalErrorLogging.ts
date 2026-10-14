import axios from 'axios';
import { describeError } from '../api/errors';
import { attachHttpLogging } from '../api/httpLogging';
import logger from './logger';

// Engancha el logger a lo que no pasa por ningun catch: excepciones sueltas,
// promesas rechazadas sin manejar y los requests del axios global.
// Devuelve una funcion para desinstalar los listeners (la usan los tests).
export function setupGlobalLogging(): () => void {
    attachHttpLogging(axios);

    const onError = (event: ErrorEvent) => {
        logger.error('Excepcion no capturada', {
            mensaje: event.message,
            archivo: event.filename,
            linea: event.lineno,
            columna: event.colno,
            stack: event.error instanceof Error ? event.error.stack : undefined,
        });
    };

    const onRejection = (event: PromiseRejectionEvent) => {
        logger.error(
            'Promesa rechazada sin manejar',
            describeError(event.reason),
        );
    };

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
        window.removeEventListener('error', onError);
        window.removeEventListener('unhandledrejection', onRejection);
    };
}
