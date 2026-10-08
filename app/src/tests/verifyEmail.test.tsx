import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import axios from 'axios';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, expect, test, vi } from 'vitest';

vi.mock('../api/login', () => ({ loginEndpoint: vi.fn() }));
vi.mock('axios');

import { loginEndpoint } from '../api/login';
import {
    resendVerificationEndpoint,
    verifyEmailEndpoint,
} from '../api/verifyEmail';
import LoginPopUp from '../components/Login/LoginPopUp';
import VerifyEmail from '../components/Pages/VerifyEmail';

const mocked = <T,>(fn: T) => fn as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mocked(axios.isAxiosError).mockImplementation(
        (err: { isAxiosError?: boolean }) => err?.isAxiosError === true,
    );
});

const renderVerifyPage = (path: string) =>
    render(
        <MemoryRouter initialEntries={[path]}>
            <Routes>
                <Route path="/verificar-email" element={<VerifyEmail />} />
                <Route path="/" element={<p>Inicio</p>} />
            </Routes>
        </MemoryRouter>,
    );

test('verifyEmailEndpoint returns ok on success', async () => {
    mocked(axios.post).mockResolvedValue({
        data: { code: 200, message: 'Email verified successfully' },
    });
    await expect(verifyEmailEndpoint('abc')).resolves.toEqual({
        ok: true,
        message: 'Email verified successfully',
    });
    expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('/verify-email'),
        { token: 'abc' },
    );
});

test('verifyEmailEndpoint returns the backend message on 400', async () => {
    mocked(axios.post).mockRejectedValue({
        isAxiosError: true,
        response: {
            data: { message: 'Invalid or expired verification token' },
        },
    });
    await expect(verifyEmailEndpoint('bad')).resolves.toEqual({
        ok: false,
        message: 'Invalid or expired verification token',
    });
});

test('verifyEmailEndpoint falls back on network errors', async () => {
    mocked(axios.post).mockRejectedValue(new Error('network'));
    await expect(verifyEmailEndpoint('abc')).resolves.toEqual({
        ok: false,
        message: 'No se pudo verificar la cuenta',
    });
});

test('resendVerificationEndpoint reports whether the request worked', async () => {
    mocked(axios.post).mockResolvedValueOnce({ data: {} });
    await expect(resendVerificationEndpoint('ana@example.com')).resolves.toBe(
        true,
    );
    expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('/verify-email/resend'),
        { email: 'ana@example.com' },
    );

    mocked(axios.post).mockRejectedValueOnce(new Error('network'));
    await expect(resendVerificationEndpoint('ana@example.com')).resolves.toBe(
        false,
    );
});

test('verification page confirms the account', async () => {
    mocked(axios.post).mockResolvedValue({
        data: { code: 200, message: 'Email verified successfully' },
    });
    renderVerifyPage('/verificar-email?token=abc');

    expect(screen.getByText('Verificando tu cuenta...')).toBeTruthy();
    expect(await screen.findByText(/Tu cuenta quedó verificada/)).toBeTruthy();
    expect(axios.post).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Ir al inicio' }));
    expect(await screen.findByText('Inicio')).toBeTruthy();
});

test('verification page shows an error for an invalid token', async () => {
    mocked(axios.post).mockRejectedValue({
        isAxiosError: true,
        response: {
            data: { message: 'Invalid or expired verification token' },
        },
    });
    renderVerifyPage('/verificar-email?token=bad');

    expect(await screen.findByText(/no es válido o ya venció/)).toBeTruthy();
});

test('verification page without token does not call the backend', () => {
    renderVerifyPage('/verificar-email');

    expect(screen.getByText(/no es válido o ya venció/)).toBeTruthy();
    expect(axios.post).not.toHaveBeenCalled();
});

const loginAsUnverified = async () => {
    mocked(loginEndpoint).mockResolvedValue({
        code: 403,
        message: 'Email not verified',
        token: '',
        email_verification_required: true,
    });
    render(
        <MemoryRouter>
            <LoginPopUp isOpen={true} onClose={vi.fn()} />
        </MemoryRouter>,
    );
    fireEvent.change(screen.getByPlaceholderText('vos@ejemplo.com'), {
        target: { value: 'ana@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
        target: { value: 'Strong123!' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Ingresar' }));
    expect(await screen.findByText(/Tenés que verificar tu mail/)).toBeTruthy();
};

test('login of an unverified account offers to resend the email', async () => {
    mocked(axios.post).mockResolvedValue({ data: {} });
    await loginAsUnverified();

    expect(localStorage.getItem('token')).toBeNull();
    expect(screen.queryByText('Email not verified')).toBeNull();

    fireEvent.click(
        screen.getByRole('button', { name: 'Reenviar mail de verificación' }),
    );
    expect(
        await screen.findByText('Te enviamos un nuevo mail de verificación.'),
    ).toBeTruthy();
    await waitFor(() =>
        expect(axios.post).toHaveBeenCalledWith(
            expect.stringContaining('/verify-email/resend'),
            { email: 'ana@example.com' },
        ),
    );
});

test('login shows an error when the resend fails', async () => {
    mocked(axios.post).mockRejectedValue(new Error('network'));
    await loginAsUnverified();

    fireEvent.click(
        screen.getByRole('button', { name: 'Reenviar mail de verificación' }),
    );
    expect(await screen.findByText(/No se pudo reenviar el mail/)).toBeTruthy();
});
