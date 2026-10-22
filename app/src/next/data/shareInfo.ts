import {
    shareInfoEndpoint,
    type TickerInfo,
} from '../../api/shares/getShareInfo';
import { shareSectorEndpoint } from '../../api/shares/getShareSector';

// Nombre de la empresa (data-colector devuelve la ficha junto con los precios).
export async function getShareInfo(ticker: string): Promise<TickerInfo> {
    const res = await shareInfoEndpoint({ share: ticker });
    return res.ticker_info;
}

// Sector de la empresa (backend-website). Puede venir como texto o como {sector}.
export async function getShareSector(ticker: string): Promise<string | null> {
    const res = await shareSectorEndpoint({ share_name: ticker });
    const value =
        typeof res === 'string'
            ? res
            : (res as { sector?: unknown } | null)?.sector;
    return typeof value === 'string' && value.trim() ? value : null;
}
