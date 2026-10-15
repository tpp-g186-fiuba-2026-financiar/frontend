import { useEffect, useState } from 'react';
import { getUserEndpoint } from '../../api/user/getUser';
import { forgotPasswordEndpoint } from '../../api/passwordReset';

type Status = 'idle' | 'sending' | 'sent' | 'error';

// El back no tiene un endpoint para cambiar la contrasena estando logueado:
// se reusa el reseteo por mail (/forgot-password + /restore-password).
function ChangePasswordSetting() {
    const [email, setEmail] = useState<string | null>(null);
    const [status, setStatus] = useState<Status>('idle');

    useEffect(() => {
        getUserEndpoint()
            .then((user) => setEmail(user.email))
            .catch(() => setStatus('error'));
    }, []);

    const sendLink = async () => {
        if (!email) return;
        setStatus('sending');
        const ok = await forgotPasswordEndpoint(email);
        setStatus(ok ? 'sent' : 'error');
    };

    return (
        <>
            <div className="settings-row">
                <div className="settings-row-label">
                    <b>Contraseña</b>
                    <span>
                        Te enviamos un link a tu mail para elegir una nueva
                        contraseña.
                    </span>
                </div>
                {email !== null && status !== 'sent' && (
                    <button
                        type="button"
                        className="btn btn-outline-theme"
                        onClick={sendLink}
                        disabled={status === 'sending'}
                    >
                        Cambiar contraseña
                    </button>
                )}
            </div>
            {status === 'sent' && (
                <span className="form-text d-block">
                    Te enviamos un link a <b>{email}</b>. Revisá tu bandeja de
                    entrada (y la carpeta de spam); el link vence en 1 hora.
                </span>
            )}
            {status === 'error' && (
                <span className="form-text text-danger d-block">
                    No se pudo enviar el mail. Intentá de nuevo más tarde.
                </span>
            )}
        </>
    );
}

export default ChangePasswordSetting;
