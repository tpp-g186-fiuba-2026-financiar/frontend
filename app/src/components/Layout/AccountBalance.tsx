import { useEffect, useState } from 'react';
import { getUserSharesBalanceEndpoint } from '../../api/userShares/getUserSharesBalanceEndpoint';

// Se refresca solo cada tanto para reflejar cambios hechos en "Editar mi
// cartera" sin necesidad de que el componente padre le avise nada.
const REFRESH_INTERVAL_MS = 30_000;

function AccountBalance() {
    const [totalBalance, setTotalBalance] = useState<number | null>(null);

    useEffect(() => {
        let cancelled = false;

        const loadBalance = async () => {
            try {
                const res = await getUserSharesBalanceEndpoint();
                if (!cancelled) setTotalBalance(res.total_current_value);
            } catch {
                if (!cancelled) setTotalBalance(null);
            }
        };

        loadBalance();
        const interval = window.setInterval(loadBalance, REFRESH_INTERVAL_MS);

        return () => {
            cancelled = true;
            window.clearInterval(interval);
        };
    }, []);

    if (totalBalance == null) return null;

    return (
        <span className="balance-total">
            {totalBalance.toLocaleString('es-AR', {
                maximumFractionDigits: 0,
            })}
        </span>
    );
}

export default AccountBalance;
