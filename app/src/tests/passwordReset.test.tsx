import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import axios from 'axios';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, expect, test, vi } from 'vitest';

vi.mock('axios');
vi.mock('../api/authFetch', () => ({
    SESSION_EXPIRED_EVENT: 'financiar:session-expired',
}));
vi.mock('../components/Layout/TickerTape', () => ({ default: () => null }));
vi.mock('../api/hello', () => ({
    helloEndpoint: (
        setIntroduction: (intro: { message: string }) => void,
        _setError: (err: string | null) => void,
        setLoading: (loading: boolean) => void,
    ) => {
        setIntroduction({ message: 'Hola' });
        setLoading(false);
    },
}));

import {
    forgotPasswordEndpoint,
    resetPasswordEndpoint,
} from '../api/passwordReset';
import LoginPopUp from '../components/Login/LoginPopUp';
import RequireAuth from '../components/Layout/RequireAuth';
import RedirectIfAuthenticated from '../components/Layout/RedirectIfAuthenticated';
import App from '../components/Pages/App';
import RestorePassword from '../components/Pages/RestorePassword';

const mocked = <T,>(fn: T) => fn as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mocked(axios.isAxiosError).mockImplementation(
        (err: { isAxiosError?: boolean }) => err?.isAxiosError === true,
    );
});

const backendError = (message: string) => ({
    isAxiosError: true,
    response: { data: { code: 400, message } },
});

const renderRestorePage = (path: string) =>
    render(
        <MemoryRouter initialEntries={[path]}>
            <Routes>
                <Route path="/restore-password" element={<RestorePassword />} />
                <Route
                    path="/"
                    element={
                        <RedirectIfAuthenticated>
                            <App />
                        </RedirectIfAuthenticated>
                    }
                />
                <Route path="/ajustes" element={<p>Ajustes</p>} />
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

const fillPasswords = (password: string, confirmation = password) => {
    const [passwordInput, confirmationInput] =
        screen.getAllByPlaceholderText('••••••••');
    fireEvent.change(passwordInput, { target: { value: password } });
    fireEvent.change(confirmationInput, { target: { value: confirmation } });
};

const submitButton = () =>
    screen.getByRole('button', { name: 'Cambiar contraseña' });

test('forgotPasswordEndpoint reports whether the request worked', async () => {
    mocked(axios.post).mockResolvedValueOnce({ data: {} });
    await expect(forgotPasswordEndpoint('ana@example.com')).resolves.toBe(true);
    expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('/forgot-password'),
        { email: 'ana@example.com' },
    );

    mocked(axios.post).mockRejectedValueOnce(new Error('network'));
    await expect(forgotPasswordEndpoint('ana@example.com')).resolves.toBe(
        false,
    );
});

test('resetPasswordEndpoint returns ok on success', async () => {
    mocked(axios.post).mockResolvedValue({
        data: { code: 200, message: 'Password updated successfully' },
    });
    await expect(resetPasswordEndpoint('abc', 'Strong123!')).resolves.toEqual({
        ok: true,
        message: 'Password updated successfully',
    });
    expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('/reset-password'),
        { token: 'abc', new_password: 'Strong123!' },
    );
});

test('resetPasswordEndpoint returns the backend message on 400', async () => {
    mocked(axios.post).mockRejectedValue(
        backendError('Invalid or expired reset token'),
    );
    await expect(resetPasswordEndpoint('bad', 'Strong123!')).resolves.toEqual({
        ok: false,
        message: 'Invalid or expired reset token',
    });
});

test('resetPasswordEndpoint falls back on network errors', async () => {
    mocked(axios.post).mockRejectedValue(new Error('network'));
    await expect(resetPasswordEndpoint('abc', 'Strong123!')).resolves.toEqual({
        ok: false,
        message: '',
    });
});

test('restore page without session ends in the landing with the login open', async () => {
    mocked(axios.post).mockResolvedValue({
        data: { code: 200, message: 'Password updated successfully' },
    });
    renderRestorePage('/restore-password?token=abc');

    expect(submitButton()).toBeDisabled();
    fillPasswords('Strong123!');
    fireEvent.click(submitButton());

    expect(
        await screen.findByText(
            'Tu contraseña se actualizó. Ya podés ingresar con la nueva.',
        ),
    ).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Ingresar' })).toBeTruthy();
    expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('/reset-password'),
        { token: 'abc', new_password: 'Strong123!' },
    );
});

test('restore page with session goes to home', async () => {
    localStorage.setItem('token', 'jwt');
    mocked(axios.post).mockResolvedValue({
        data: { code: 200, message: 'Password updated successfully' },
    });
    renderRestorePage('/restore-password?token=abc');

    fillPasswords('Strong123!');
    fireEvent.click(submitButton());

    expect(await screen.findByText('Pantalla principal')).toBeTruthy();
});

test('landing redirects to home with session', () => {
    localStorage.setItem('token', 'jwt');
    renderRestorePage('/');

    expect(screen.getByText('Pantalla principal')).toBeTruthy();
});

test('restore page with session asks for a new link from settings', async () => {
    localStorage.setItem('token', 'jwt');
    mocked(axios.post).mockRejectedValue(
        backendError('Invalid or expired reset token'),
    );
    renderRestorePage('/restore-password?token=bad');

    fillPasswords('Strong123!');
    fireEvent.click(submitButton());
    fireEvent.click(
        await screen.findByRole('button', { name: 'Pedir un nuevo link' }),
    );

    expect(await screen.findByText('Ajustes')).toBeTruthy();
});

test('restore page requires matching passwords', () => {
    renderRestorePage('/restore-password?token=abc');

    fillPasswords('Strong123!', 'Strong123?');
    expect(screen.getByText('Las contraseñas no coinciden.')).toBeTruthy();
    expect(submitButton()).toBeDisabled();
});

test('restore page translates weak password errors', async () => {
    mocked(axios.post).mockRejectedValue(
        backendError('Password must contain at least one digit'),
    );
    renderRestorePage('/restore-password?token=abc');

    fillPasswords('NoDigits!!');
    fireEvent.click(submitButton());

    expect(
        await screen.findByText('La contraseña debe tener al menos un número.'),
    ).toBeTruthy();
    // El token sigue sirviendo: el formulario queda disponible.
    expect(submitButton()).toBeEnabled();
});

test('restore page shows a generic error for unknown failures', async () => {
    mocked(axios.post).mockRejectedValue(new Error('network'));
    renderRestorePage('/restore-password?token=abc');

    fillPasswords('Strong123!');
    fireEvent.click(submitButton());

    expect(
        await screen.findByText(/No se pudo actualizar la contraseña/),
    ).toBeTruthy();
});

test('restore page offers a new link when the token is invalid', async () => {
    mocked(axios.post).mockRejectedValue(
        backendError('Invalid or expired reset token'),
    );
    renderRestorePage('/restore-password?token=bad');

    fillPasswords('Strong123!');
    fireEvent.click(submitButton());

    expect(await screen.findByText(/no es válido o ya venció/)).toBeTruthy();
    fireEvent.click(
        screen.getByRole('button', { name: 'Pedir un nuevo link' }),
    );

    expect(
        await screen.findByRole('heading', { name: 'Recuperar contraseña' }),
    ).toBeTruthy();
});

test('restore page without token does not show the form', () => {
    renderRestorePage('/restore-password');

    expect(screen.getByText(/no es válido o ya venció/)).toBeTruthy();
    expect(screen.queryByPlaceholderText('••••••••')).toBeNull();
    expect(axios.post).not.toHaveBeenCalled();
});

const openForgotView = () => {
    render(
        <MemoryRouter>
            <LoginPopUp isOpen={true} onClose={vi.fn()} />
        </MemoryRouter>,
    );
    fireEvent.change(screen.getByPlaceholderText('vos@ejemplo.com'), {
        target: { value: 'ana@example.com' },
    });
    fireEvent.click(
        screen.getByRole('button', { name: '¿Olvidaste tu contraseña?' }),
    );
    expect(
        screen.getByRole('heading', { name: 'Recuperar contraseña' }),
    ).toBeTruthy();
};

test('login popup sends the reset email with the typed address', async () => {
    mocked(axios.post).mockResolvedValue({ data: {} });
    openForgotView();

    // El mail escrito en el login se mantiene.
    expect(screen.getByPlaceholderText('vos@ejemplo.com')).toHaveValue(
        'ana@example.com',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Enviar link' }));

    expect(
        await screen.findByText(/te enviamos un link para restablecer/),
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Enviar link' })).toBeDisabled();
    await waitFor(() =>
        expect(axios.post).toHaveBeenCalledWith(
            expect.stringContaining('/forgot-password'),
            { email: 'ana@example.com' },
        ),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Volver' }));
    expect(screen.getByRole('heading', { name: 'Ingresar' })).toBeTruthy();
});

test('login popup shows an error when the reset email fails', async () => {
    mocked(axios.post).mockRejectedValue(new Error('network'));
    openForgotView();

    fireEvent.click(screen.getByRole('button', { name: 'Enviar link' }));

    expect(await screen.findByText(/No se pudo enviar el mail/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Enviar link' })).toBeEnabled();
});

test('forgot view requires an email', () => {
    render(
        <MemoryRouter>
            <LoginPopUp isOpen={true} onClose={vi.fn()} initialMode="forgot" />
        </MemoryRouter>,
    );

    expect(screen.getByRole('button', { name: 'Enviar link' })).toBeDisabled();
});
