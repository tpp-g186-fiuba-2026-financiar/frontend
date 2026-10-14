import { act, fireEvent, render, screen } from '@testing-library/react';
import axios, { AxiosError, AxiosHeaders } from 'axios';
import { http, HttpResponse } from 'msw';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { server } from '../mocks/server';
import authAxios, { SESSION_EXPIRED_EVENT } from '../api/authFetch';
import { backendMessage, describeError, stripQuery } from '../api/errors';
import { attachHttpLogging } from '../api/httpLogging';
import ErrorBoundary from '../components/Layout/ErrorBoundary';
import SessionExpiredListener from '../components/Layout/SessionExpiredListener';
import { setupGlobalLogging } from '../utils/globalErrorLogging';
import logger, { getLogLevel, redact, setLogLevel } from '../utils/logger';

const URL = 'http://localhost:8500/user/shares/trends';

function axiosError(
    status: number | undefined,
    data?: unknown,
    url = `${URL}?ticker=GGAL`,
): AxiosError {
    const config = { url, method: 'get', headers: new AxiosHeaders() };
    const response =
        status === undefined
            ? undefined
            : {
                  status,
                  statusText: '',
                  data,
                  headers: {},
                  config,
              };
    return new AxiosError(
        'Request failed',
        status === undefined ? 'ERR_NETWORK' : 'ERR_BAD_RESPONSE',
        config,
        undefined,
        response,
    );
}

let spies: Record<
    'debug' | 'info' | 'warn' | 'error',
    ReturnType<typeof vi.spyOn>
>;

beforeEach(() => {
    setLogLevel('debug');
    spies = {
        debug: vi.spyOn(console, 'debug').mockImplementation(() => {}),
        info: vi.spyOn(console, 'info').mockImplementation(() => {}),
        warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
        error: vi.spyOn(console, 'error').mockImplementation(() => {}),
    };
    localStorage.clear();
});

afterEach(() => {
    setLogLevel('silent');
    vi.restoreAllMocks();
});

describe('logger', () => {
    test('writes a structured entry with level, route and context', () => {
        logger.warn('algo fallo', { ticker: 'GGAL' });

        expect(spies.warn).toHaveBeenCalledTimes(1);
        const [text, entry] = spies.warn.mock.calls[0];
        expect(text).toBe('[FinanciAr] algo fallo');
        expect(entry).toMatchObject({
            nivel: 'warn',
            mensaje: 'algo fallo',
            ruta: window.location.pathname,
            contexto: { ticker: 'GGAL' },
        });
        expect(typeof entry.ts).toBe('string');
    });

    test('omits the context when none is given', () => {
        logger.info('sin contexto');
        expect(spies.info.mock.calls[0][1]).not.toHaveProperty('contexto');
    });

    test('filters entries below the current level', () => {
        setLogLevel('warn');
        expect(getLogLevel()).toBe('warn');

        logger.debug('d');
        logger.info('i');
        logger.warn('w');
        logger.error('e');

        expect(spies.debug).not.toHaveBeenCalled();
        expect(spies.info).not.toHaveBeenCalled();
        expect(spies.warn).toHaveBeenCalledTimes(1);
        expect(spies.error).toHaveBeenCalledTimes(1);
    });

    test('silent turns everything off', () => {
        setLogLevel('silent');
        logger.error('e');
        expect(spies.error).not.toHaveBeenCalled();
    });

    test('redacts sensitive keys at any depth', () => {
        expect(
            redact({
                Authorization: 'Bearer x',
                password: 'p',
                nested: { token: 't', totp_code: '123456', keep: 1 },
                list: [{ secret: 's' }],
                ok: 'si',
            }),
        ).toEqual({
            Authorization: '[oculto]',
            password: '[oculto]',
            nested: { token: '[oculto]', totp_code: '[oculto]', keep: 1 },
            list: [{ secret: '[oculto]' }],
            ok: 'si',
        });
    });

    test('cuts very deep objects', () => {
        expect(redact({ a: { b: { c: { d: { e: 1 } } } } })).toEqual({
            a: { b: { c: { d: '[...]' } } },
        });
    });
});

describe('errors', () => {
    test('stripQuery drops the query string', () => {
        expect(stripQuery('/a?b=1')).toBe('/a');
        expect(stripQuery(undefined)).toBeUndefined();
    });

    test('describes an axios error with the back answer', () => {
        const err = axiosError(500, {
            message: 'Modelo caido',
            error: 'MODEL_DOWN',
        });
        expect(describeError(err)).toEqual({
            mensaje: 'Request failed',
            status: 500,
            metodo: 'GET',
            url: URL,
            code: 'ERR_BAD_RESPONSE',
            mensajeBack: 'Modelo caido',
            codigoBack: 'MODEL_DOWN',
        });
    });

    test('describes a network error without response', () => {
        expect(describeError(axiosError(undefined))).toEqual({
            mensaje: 'Request failed',
            metodo: 'GET',
            url: URL,
            code: 'ERR_NETWORK',
        });
    });

    test('describes plain errors and other values', () => {
        expect(describeError(new TypeError('boom'))).toEqual({
            mensaje: 'boom',
            nombre: 'TypeError',
        });
        expect(describeError('raro')).toEqual({ mensaje: 'raro' });
    });

    test('backendMessage only returns the readable message', () => {
        expect(
            backendMessage(axiosError(400, { message: 'Codigo invalido' })),
        ).toBe('Codigo invalido');
        expect(
            backendMessage(axiosError(403, { error: 'RISK_PROFILE_REQUIRED' })),
        ).toBeUndefined();
        expect(backendMessage(new Error('x'))).toBeUndefined();
    });
});

describe('http logging', () => {
    const client = axios.create();
    attachHttpLogging(client);

    test('logs successful requests as debug with status and duration', async () => {
        server.use(http.get(URL, () => HttpResponse.json({ ok: true })));

        await client.get(`${URL}?ticker=GGAL`);

        expect(spies.debug).toHaveBeenCalledTimes(1);
        expect(spies.debug.mock.calls[0][1].contexto).toMatchObject({
            metodo: 'GET',
            url: URL,
            status: 200,
        });
        expect(typeof spies.debug.mock.calls[0][1].contexto.ms).toBe('number');
    });

    test('logs 4xx as warn', async () => {
        server.use(
            http.get(URL, () =>
                HttpResponse.json(
                    { message: 'No encontrado' },
                    { status: 404 },
                ),
            ),
        );

        await expect(client.get(URL)).rejects.toBeTruthy();

        expect(spies.warn).toHaveBeenCalledTimes(1);
        expect(spies.warn.mock.calls[0][1].contexto).toMatchObject({
            status: 404,
            mensajeBack: 'No encontrado',
        });
        expect(spies.error).not.toHaveBeenCalled();
    });

    test('logs 5xx and network errors as error', async () => {
        server.use(
            http.get(URL, () => new HttpResponse(null, { status: 502 })),
        );
        await expect(client.get(URL)).rejects.toBeTruthy();

        server.use(http.get(URL, () => HttpResponse.error()));
        await expect(client.get(URL)).rejects.toBeTruthy();

        expect(spies.error).toHaveBeenCalledTimes(2);
        expect(spies.error.mock.calls[0][1].contexto.status).toBe(502);
        expect(spies.error.mock.calls[1][1].contexto.status).toBeUndefined();
    });

    test('does not log cancelled requests', async () => {
        server.use(http.get(URL, () => HttpResponse.json({})));
        const controller = new AbortController();
        controller.abort();

        await expect(
            client.get(URL, { signal: controller.signal }),
        ).rejects.toBeTruthy();

        expect(spies.warn).not.toHaveBeenCalled();
        expect(spies.error).not.toHaveBeenCalled();
    });
});

describe('session expiry', () => {
    test('a 401 with a token clears it and emits the event', async () => {
        localStorage.setItem('token', 'viejo');
        server.use(
            http.get(URL, () =>
                HttpResponse.json({ message: 'expired' }, { status: 401 }),
            ),
        );
        const listener = vi.fn();
        window.addEventListener(SESSION_EXPIRED_EVENT, listener);

        await expect(authAxios.get(URL)).rejects.toBeTruthy();

        window.removeEventListener(SESSION_EXPIRED_EVENT, listener);
        expect(listener).toHaveBeenCalledTimes(1);
        expect(localStorage.getItem('token')).toBeNull();
    });

    test('a 401 without a token does nothing', async () => {
        server.use(
            http.get(URL, () => new HttpResponse(null, { status: 401 })),
        );
        const listener = vi.fn();
        window.addEventListener(SESSION_EXPIRED_EVENT, listener);

        await expect(authAxios.get(URL)).rejects.toBeTruthy();

        window.removeEventListener(SESSION_EXPIRED_EVENT, listener);
        expect(listener).not.toHaveBeenCalled();
    });

    test('the listener sends the user back to the landing', () => {
        render(
            <MemoryRouter initialEntries={['/home']}>
                <SessionExpiredListener />
                <Routes>
                    <Route path="/" element={<p>Inicio</p>} />
                    <Route path="/home" element={<p>Cartera</p>} />
                </Routes>
            </MemoryRouter>,
        );
        expect(screen.getByText('Cartera')).toBeInTheDocument();

        act(() => {
            window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT));
        });

        expect(screen.getByText('Inicio')).toBeInTheDocument();
    });
});

describe('ErrorBoundary', () => {
    function Broken(): never {
        throw new Error('render roto');
    }

    test('renders the children when nothing fails', () => {
        render(
            <ErrorBoundary>
                <p>Todo bien</p>
            </ErrorBoundary>,
        );
        expect(screen.getByText('Todo bien')).toBeInTheDocument();
    });

    test('logs the error and shows a reload screen', () => {
        const reload = vi.fn();
        vi.spyOn(window, 'location', 'get').mockReturnValue({
            ...window.location,
            reload,
        });

        render(
            <ErrorBoundary>
                <Broken />
            </ErrorBoundary>,
        );

        expect(screen.getByRole('alert')).toHaveTextContent('Algo salió mal');
        const logged = spies.error.mock.calls.find(
            ([text]: unknown[]) => text === '[FinanciAr] Error de render',
        );
        expect(logged?.[1].contexto).toMatchObject({ mensaje: 'render roto' });

        fireEvent.click(screen.getByRole('button', { name: 'Recargar' }));
        expect(reload).toHaveBeenCalled();
    });
});

describe('global logging', () => {
    test('logs uncaught errors and unhandled rejections', () => {
        const teardown = setupGlobalLogging();

        window.dispatchEvent(
            new ErrorEvent('error', {
                message: 'explota',
                filename: 'app.js',
                lineno: 3,
                colno: 7,
                error: new Error('explota'),
            }),
        );
        const rejection = new Event(
            'unhandledrejection',
        ) as PromiseRejectionEvent;
        Object.defineProperty(rejection, 'reason', {
            value: new Error('nadie'),
        });
        window.dispatchEvent(rejection);

        teardown();
        window.dispatchEvent(new ErrorEvent('error', { message: 'despues' }));

        expect(spies.error).toHaveBeenCalledTimes(2);
        expect(spies.error.mock.calls[0][1].contexto).toMatchObject({
            mensaje: 'explota',
            archivo: 'app.js',
            linea: 3,
        });
        expect(spies.error.mock.calls[1][1].contexto).toMatchObject({
            mensaje: 'nadie',
        });
    });
});
