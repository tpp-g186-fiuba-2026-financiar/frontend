import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, expect, test, vi } from 'vitest';

vi.mock('../api/login', () => ({ loginEndpoint: vi.fn() }));
vi.mock('../api/user/getUser', () => ({ getUserEndpoint: vi.fn() }));
vi.mock('../api/user/twoFactor', () => ({
    setupTwoFactorEndpoint: vi.fn(),
    enableTwoFactorEndpoint: vi.fn(),
    disableTwoFactorEndpoint: vi.fn(),
}));

import { loginEndpoint } from '../api/login';
import { getUserEndpoint } from '../api/user/getUser';
import {
    disableTwoFactorEndpoint,
    enableTwoFactorEndpoint,
    setupTwoFactorEndpoint,
} from '../api/user/twoFactor';
import LoginPopUp from '../components/Login/LoginPopUp';
import TwoFactorSetting from '../components/settings/TwoFactorSetting';

const mocked = <T,>(fn: T) => fn as unknown as ReturnType<typeof vi.fn>;

const user = (enabled: boolean) => ({
    id: 1,
    email: 'ana@example.com',
    full_name: 'Ana',
    risk_profile: 'moderate',
    is_active: true,
    two_factor_enabled: enabled,
    created_at: '2026-01-01',
});

beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
});

test('login asks for the 2FA code and sends it', async () => {
    mocked(loginEndpoint)
        .mockResolvedValueOnce({
            code: 401,
            message: 'Two-factor code required',
            token: '',
            two_factor_required: true,
        })
        .mockResolvedValueOnce({ code: 200, message: 'ok', token: 'jwt' });
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

    const codeInput = await screen.findByLabelText('Código de verificación');
    fireEvent.change(codeInput, { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: 'Ingresar' }));

    await waitFor(() => expect(localStorage.getItem('token')).toBe('jwt'));
    expect(loginEndpoint).toHaveBeenLastCalledWith({
        email: 'ana@example.com',
        password: 'Strong123!',
        totp_code: '123456',
    });
});

test('user can enable 2FA from settings', async () => {
    mocked(getUserEndpoint).mockResolvedValue(user(false));
    mocked(setupTwoFactorEndpoint).mockResolvedValue({
        code: 200,
        secret: 'JBSWY3DPEHPK3PXP',
        otpauth_url: 'otpauth://totp/x',
        qr_base64: 'abc',
    });
    mocked(enableTwoFactorEndpoint).mockResolvedValue({
        ok: true,
        message: 'enabled',
    });
    render(<TwoFactorSetting />);

    fireEvent.click(await screen.findByRole('button', { name: 'Activar' }));
    expect(await screen.findByText('JBSWY3DPEHPK3PXP')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Código de verificación'), {
        target: { value: '654321' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Activar' }));

    await waitFor(() =>
        expect(enableTwoFactorEndpoint).toHaveBeenCalledWith('654321'),
    );
    expect(
        await screen.findByRole('button', { name: 'Desactivar' }),
    ).toBeInTheDocument();
});

test('disabling 2FA shows the backend error on a wrong code', async () => {
    mocked(getUserEndpoint).mockResolvedValue(user(true));
    mocked(disableTwoFactorEndpoint).mockResolvedValue({
        ok: false,
        message: 'Invalid verification code',
    });
    render(<TwoFactorSetting />);

    fireEvent.click(await screen.findByRole('button', { name: 'Desactivar' }));
    fireEvent.change(screen.getByLabelText('Código de verificación'), {
        target: { value: '000000' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Desactivar' }));

    expect(
        await screen.findByText('Invalid verification code'),
    ).toBeInTheDocument();
});
