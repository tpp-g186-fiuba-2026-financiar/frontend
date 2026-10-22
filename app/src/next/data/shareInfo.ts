import {
    shareInfoEndpoint,
    type TickerInfo,
} from '../../api/shares/getShareInfo';
import { shareSectorEndpoint } from '../../api/shares/getShareSector';

export async function getShareInfo(ticker: string): Promise<TickerInfo> {
    const res = await shareInfoEndpoint({ share: ticker });
    return res.ticker_info;
}

export async function getShareSector(ticker: string): Promise<string | null> {
    const res = await shareSectorEndpoint({ share_name: ticker });
    const value =
        typeof res === 'string'
            ? res
            : (res as { sector?: unknown } | null)?.sector;
    return typeof value === 'string' && value.trim() ? value : null;
}
