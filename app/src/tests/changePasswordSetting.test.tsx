import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';

vi.mock('../api/user/getUser', () => ({ getUserEndpoint: vi.fn() }));
vi.mock('../api/passwordReset', () => ({ forgotPasswordEndpoint: vi.fn() }));

import { getUserEndpoint } from '../api/user/getUser';
import { forgotPasswordEndpoint } from '../api/passwordReset';
import ChangePasswordSetting from '../components/settings/ChangePasswordSetting';

const mocked = <T,>(fn: T) => fn as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
    vi.clearAllMocks();
    mocked(getUserEndpoint).mockResolvedValue({
        id: 1,
        email: 'ana@example.com',
        full_name: 'Ana',
        risk_profile: 'moderate',
        is_active: true,
        two_factor_enabled: false,
        created_at: '2026-01-01',
    });
});

test('sends the reset link to the user email', async () => {
    mocked(forgotPasswordEndpoint).mockResolvedValue(true);
    render(<ChangePasswordSetting />);

    fireEvent.click(
        await screen.findByRole('button', { name: 'Cambiar contraseña' }),
    );

    expect(await screen.findByText('ana@example.com')).toBeTruthy();
    expect(forgotPasswordEndpoint).toHaveBeenCalledWith('ana@example.com');
    expect(
        screen.queryByRole('button', { name: 'Cambiar contraseña' }),
    ).toBeNull();
});

test('shows an error when the email cannot be sent', async () => {
    mocked(forgotPasswordEndpoint).mockResolvedValue(false);
    render(<ChangePasswordSetting />);

    fireEvent.click(
        await screen.findByRole('button', { name: 'Cambiar contraseña' }),
    );

    expect(await screen.findByText(/No se pudo enviar el mail/)).toBeTruthy();
    expect(
        screen.getByRole('button', { name: 'Cambiar contraseña' }),
    ).toBeEnabled();
});

test('hides the button when the user cannot be loaded', async () => {
    mocked(getUserEndpoint).mockRejectedValue(new Error('network'));
    render(<ChangePasswordSetting />);

    expect(await screen.findByText(/No se pudo enviar el mail/)).toBeTruthy();
    expect(
        screen.queryByRole('button', { name: 'Cambiar contraseña' }),
    ).toBeNull();
    expect(forgotPasswordEndpoint).not.toHaveBeenCalled();
});
