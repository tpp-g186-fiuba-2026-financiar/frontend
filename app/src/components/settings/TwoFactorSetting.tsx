import { useEffect, useState } from 'react';
import { getUserEndpoint } from '../../api/user/getUser';
import {
    disableTwoFactorEndpoint,
    enableTwoFactorEndpoint,
    setupTwoFactorEndpoint,
    type TwoFactorSetupResponse,
} from '../../api/user/twoFactor';

type Mode = 'idle' | 'enrolling' | 'disabling';

function TwoFactorSetting() {
    const [enabled, setEnabled] = useState<boolean | null>(null);
    const [mode, setMode] = useState<Mode>('idle');
    const [setup, setSetup] = useState<TwoFactorSetupResponse | null>(null);
    const [code, setCode] = useState<string>('');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        getUserEndpoint()
            .then((user) => setEnabled(user.two_factor_enabled))
            .catch(() => setEnabled(false));
    }, []);

    const reset = () => {
        setMode('idle');
        setSetup(null);
        setCode('');
        setError(null);
    };

    const startEnrolling = async () => {
        setError(null);
        try {
            setSetup(await setupTwoFactorEndpoint());
            setMode('enrolling');
        } catch {
            setError('No se pudo iniciar la configuración');
        }
    };

    const confirm = async () => {
        const submit =
            mode === 'enrolling'
                ? enableTwoFactorEndpoint
                : disableTwoFactorEndpoint;
        const r = await submit(code.trim());
        if (r.ok) {
            setEnabled(mode === 'enrolling');
            reset();
        } else {
            setError(r.message);
        }
    };

    return (
        <>
            <div className="settings-row">
                <div className="settings-row-label">
                    <b>Verificación en dos pasos (2FA)</b>
                    <span>
                        {enabled
                            ? 'Activada: al ingresar te pedimos un código de tu app autenticadora.'
                            : 'Protegé tu cuenta con Google Authenticator, Authy o similar.'}
                    </span>
                </div>
                {mode === 'idle' && enabled !== null && (
                    <button
                        type="button"
                        className="btn btn-outline-theme"
                        onClick={
                            enabled
                                ? () => setMode('disabling')
                                : startEnrolling
                        }
                    >
                        {enabled ? 'Desactivar' : 'Activar'}
                    </button>
                )}
            </div>

            {mode !== 'idle' && (
                <div className="settings-row-sub">
                    {mode === 'enrolling' && setup && (
                        <div className="mb-3">
                            <p className="mb-2">
                                1. Escaneá este QR con tu app autenticadora.
                            </p>
                            <img
                                alt="Código QR para configurar 2FA"
                                src={`data:image/png;base64,${setup.qr_base64}`}
                                width={180}
                                height={180}
                            />
                            <p className="form-text">
                                ¿No podés escanear? Ingresá esta clave a mano:{' '}
                                <code>{setup.secret}</code>
                            </p>
                            <p className="mb-2">
                                2. Ingresá el código de 6 dígitos que muestra la
                                app.
                            </p>
                        </div>
                    )}
                    {mode === 'disabling' && (
                        <p className="mb-2">
                            Ingresá un código de tu app autenticadora para
                            desactivar el 2FA.
                        </p>
                    )}
                    <input
                        className="form-control mb-2"
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={6}
                        placeholder="123456"
                        aria-label="Código de verificación"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                    />
                    {error && (
                        <span className="form-text text-danger d-block mb-2">
                            {error}
                        </span>
                    )}
                    <div className="d-flex gap-2">
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={reset}
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            className="btn btn-primary"
                            onClick={confirm}
                            disabled={code.trim().length !== 6}
                        >
                            {mode === 'enrolling' ? 'Activar' : 'Desactivar'}
                        </button>
                    </div>
                </div>
            )}
            {mode === 'idle' && error && (
                <span className="form-text text-danger">{error}</span>
            )}
        </>
    );
}

export default TwoFactorSetting;
