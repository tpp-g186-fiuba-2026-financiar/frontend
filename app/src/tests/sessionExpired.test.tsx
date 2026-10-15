import { act, render, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { server } from '../mocks/server';
import authAxios, { SESSION_EXPIRED_EVENT } from '../api/authFetch';
import RequireAuth from '../components/Layout/RequireAuth';
import App from '../components/Pages/App';

const URL = 'http://localhost:8500/user';

beforeEach(() => {
    localStorage.clear();
});

const answerWith = (status: number) =>
    server.use(
        http.get(URL, () => HttpResponse.json({ code: status }, { status })),
    );

describe('authFetch session interceptor', () => {
    test('drops the token and emits the event on 401', async () => {
        localStorage.setItem('token', 'expired-jwt');
        answerWith(401);
        const listener = vi.fn();
        window.addEventListener(SESSION_EXPIRED_EVENT, listener);

        await expect(authAxios.get(URL)).rejects.toBeTruthy();

        window.removeEventListener(SESSION_EXPIRED_EVENT, listener);
        expect(listener).toHaveBeenCalledTimes(1);
        expect(localStorage.getItem('token')).toBeNull();
    });

    test('ignores 401 without a token and other errors', async () => {
        const listener = vi.fn();
        window.addEventListener(SESSION_EXPIRED_EVENT, listener);

        answerWith(401);
        await expect(authAxios.get(URL)).rejects.toBeTruthy();

        localStorage.setItem('token', 'jwt');
        answerWith(500);
        await expect(authAxios.get(URL)).rejects.toBeTruthy();

        window.removeEventListener(SESSION_EXPIRED_EVENT, listener);
        expect(listener).not.toHaveBeenCalled();
        expect(localStorage.getItem('token')).toBe('jwt');
    });
});

test('protected pages go back to the landing with the login open', async () => {
    localStorage.setItem('token', 'jwt');
    render(
        <MemoryRouter initialEntries={['/home']}>
            <Routes>
                <Route path="/" element={<App />} />
                <Route
                    path="/home"
                    element={
                        <RequireAuth>
                            <p>Pantalla principal</p>
                        </RequireAuth>
                    }
                />
            </Routes>
        </MemoryRouter>,
    );
    expect(screen.getByText('Pantalla principal')).toBeTruthy();

    act(() => {
        localStorage.removeItem('token');
        window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    });

    expect(
        await screen.findByText(
            'Tu sesión venció. Volvé a ingresar para continuar.',
        ),
    ).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Ingresar' })).toBeTruthy();
});
