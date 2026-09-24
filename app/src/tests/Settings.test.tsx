import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Settings from '../components/Pages/Settings';

const navigateMock = vi.fn();
vi.mock('react-router-dom', () => ({
    useNavigate: () => navigateMock,
}));

// Achicamos cada sección hija a un marcador simple: lo que nos importa acá
// es la lógica de tabs de Settings, no el contenido de cada hija (que ya
// tiene sus propios tests).
vi.mock('../settings/ColorModeSetting', () => ({
    default: () => <div>ColorModeSetting</div>,
}));
vi.mock('../settings/RetakeRiskQuizSetting', () => ({
    default: () => <div>RetakeRiskQuizSetting</div>,
}));
vi.mock('../settings/TwoFactorSetting', () => ({
    default: () => <div>TwoFactorSetting</div>,
}));
vi.mock('../settings/NotificationsSettings', () => ({
    default: () => <div>NotificationsSettings</div>,
}));
vi.mock('../settings/DefaultModelsSettings', () => ({
    default: () => <div>DefaultModelsSettings</div>,
}));

beforeEach(() => {
    navigateMock.mockClear();
});

describe('Settings', () => {
    it('marks the active tab button with the "active" class', async () => {
        const user = userEvent.setup();
        render(<Settings />);

        const generalBtn = screen.getByRole('button', { name: 'General' });
        const notifBtn = screen.getByRole('button', { name: 'Notificaciones' });

        expect(generalBtn.className).toContain('active');
        expect(notifBtn.className).not.toContain('active');

        await user.click(notifBtn);

        expect(notifBtn.className).toContain('active');
        expect(generalBtn.className).not.toContain('active');
    });

    it('navigates home when clicking the wordmark or "Volver"', async () => {
        const user = userEvent.setup();
        render(<Settings />);

        await user.click(screen.getByRole('button', { name: /Financi/ }));
        expect(navigateMock).toHaveBeenCalledWith('/home');

        await user.click(screen.getByRole('button', { name: /volver/i }));
        expect(navigateMock).toHaveBeenCalledWith('/home');
        expect(navigateMock).toHaveBeenCalledTimes(2);
    });
});
