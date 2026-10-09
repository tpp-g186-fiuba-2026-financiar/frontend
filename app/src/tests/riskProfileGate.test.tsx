import {
    act,
    fireEvent,
    render,
    screen,
    waitFor,
} from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { server } from '../mocks/server';
import authAxios, {
    RISK_PROFILE_EVENT,
    type RiskProfileReason,
} from '../api/authFetch';

vi.mock('../api/user/updateProfile', () => ({
    updateProfileEndpoint: vi.fn(),
}));

import { updateProfileEndpoint } from '../api/user/updateProfile';
import RiskProfileGate from '../components/settings/RiskProfileGate';

const URL = 'http://localhost:8500/user/shares/trends';

function answerQuestionnaire() {
    for (let index = 0; index < 9; index += 1) {
        const options = screen
            .getAllByRole('button')
            .filter((button) =>
                button.className.includes('btn-outline-secondary'),
            );
        fireEvent.click(options[options.length - 1]);
        fireEvent.click(
            screen.getByRole('button', {
                name: index === 8 ? 'Finalizar' : 'Siguiente',
            }),
        );
    }
}

function emit(reason: RiskProfileReason) {
    act(() => {
        window.dispatchEvent(
            new CustomEvent(RISK_PROFILE_EVENT, { detail: reason }),
        );
    });
}

beforeEach(() => {
    vi.clearAllMocks();
});

describe('authFetch risk profile interceptor', () => {
    test.each([
        ['RISK_PROFILE_EXPIRED', 'expired'],
        ['RISK_PROFILE_REQUIRED', 'required'],
    ])('emits the event when the back answers %s', async (code, reason) => {
        server.use(
            http.get(URL, () =>
                HttpResponse.json({ code: 403, error: code }, { status: 403 }),
            ),
        );
        const listener = vi.fn();
        window.addEventListener(RISK_PROFILE_EVENT, listener);

        await expect(authAxios.get(URL)).rejects.toBeTruthy();

        window.removeEventListener(RISK_PROFILE_EVENT, listener);
        expect(listener).toHaveBeenCalledTimes(1);
        expect((listener.mock.calls[0][0] as CustomEvent).detail).toBe(reason);
    });

    test('ignores other errors', async () => {
        server.use(
            http.get(URL, () =>
                HttpResponse.json({ code: 403 }, { status: 403 }),
            ),
        );
        const listener = vi.fn();
        window.addEventListener(RISK_PROFILE_EVENT, listener);

        await expect(authAxios.get(URL)).rejects.toBeTruthy();

        window.removeEventListener(RISK_PROFILE_EVENT, listener);
        expect(listener).not.toHaveBeenCalled();
    });
});

describe('RiskProfileGate', () => {
    test('renders nothing while the profile is valid', () => {
        render(<RiskProfileGate />);
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    test('opens a mandatory questionnaire when the profile expired', async () => {
        vi.mocked(updateProfileEndpoint).mockResolvedValue({
            code: 200,
            message: 'ok',
        });
        const onCompleted = vi.fn();
        render(<RiskProfileGate reason="expired" onCompleted={onCompleted} />);

        expect(
            screen.getByText('Tu perfil de inversor venció'),
        ).toBeInTheDocument();
        expect(
            screen.queryByRole('button', { name: 'Close' }),
        ).not.toBeInTheDocument();
        fireEvent.click(document.querySelector('.modal-backdrop')!);
        expect(screen.getByRole('dialog')).toBeInTheDocument();

        answerQuestionnaire();

        await waitFor(() =>
            expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
        );
        expect(updateProfileEndpoint).toHaveBeenCalledWith({
            risk_profile: 'aggressive',
        });
        expect(onCompleted).toHaveBeenCalledWith('aggressive');
    });

    test('opens when a request is rejected and shows save errors', async () => {
        vi.mocked(updateProfileEndpoint).mockRejectedValueOnce(
            new Error('offline'),
        );
        render(<RiskProfileGate />);

        emit('required');
        expect(
            screen.getByText('Completá tu perfil de inversor'),
        ).toBeInTheDocument();

        answerQuestionnaire();

        expect(
            await screen.findByText(/No se pudo guardar tu perfil/),
        ).toBeInTheDocument();
        expect(screen.getByRole('dialog')).toBeInTheDocument();

        vi.mocked(updateProfileEndpoint).mockResolvedValueOnce({
            code: 200,
            message: 'ok',
        });
        fireEvent.click(screen.getByRole('button', { name: 'Finalizar' }));
        await waitFor(() =>
            expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
        );

        emit('expired');
        expect(
            screen.getByText('Tu perfil de inversor venció'),
        ).toBeInTheDocument();
    });
});
