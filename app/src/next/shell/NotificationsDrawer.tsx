import { useEffect, useState } from 'react';
import {
    getUserAlertSubscriptionsEndpoint,
    type AlertSubscriptions,
} from '../../api/subscriptions/getUserAlertSubscriptions';

// Panel de notificaciones: muestra a qué alertas está suscripto el usuario.
// Las alertas llegan por mail cuando cambia la señal de una acción.
export default function NotificationsDrawer({
    onGoAlerts,
}: {
    onGoAlerts: () => void;
}) {
    const [subs, setSubs] = useState<AlertSubscriptions | null>(null);
    const [failed, setFailed] = useState(false);
    useEffect(() => {
        getUserAlertSubscriptionsEndpoint().then(setSubs, () =>
            setFailed(true),
        );
    }, []);
    return (
        <div>
            <p className="nx-muted" style={{ fontSize: 13 }}>
                Te avisamos por mail cuando un modelo cambia de opinión sobre
                una acción que seguís, y los lunes te mandamos un resumen de tu
                cartera.
            </p>
            {failed && (
                <p className="nx-muted">No pudimos cargar tus alertas.</p>
            )}
            {subs && (
                <div className="nx-list" style={{ margin: '12px 0' }}>
                    <div className="nx-li">
                        <span className="nx-grow">Toda la cartera</span>
                        <b className="nx-ink">
                            {subs.portfolio ? 'activada' : 'apagada'}
                        </b>
                    </div>
                    {subs.tickers.map((t) => (
                        <div className="nx-li" key={t}>
                            <span className="nx-grow">{t}</span>
                            <b className="nx-ink">activada</b>
                        </div>
                    ))}
                    {!subs.portfolio && subs.tickers.length === 0 && (
                        <div className="nx-li nx-muted">
                            Todavía no seguís ninguna acción.
                        </div>
                    )}
                </div>
            )}
            <button type="button" className="nx-btn" onClick={onGoAlerts}>
                Configurar alertas
            </button>
        </div>
    );
}
