import axios from 'axios';
const ENDPOINT = '/historical-data/';
const apiURL = import.meta.env.VITE_DATA_COLLECTOR_API + ENDPOINT;

export interface ShareInfoRequest {
    share: string;
}
export interface TickerInfo {
    descripcion: string;
    nombre_corto: string;
    nombre_largo: string;
}
export interface DayInfo {
    close_amount: number;
    close_unadj_amount: number;
    high_amount: number;
    low_amount: number;
    open_amount: number;
    ticker: string;
    ts: number;
}

export interface ShareInfoResponse {
    cached: boolean;
    data: DayInfo[];
    status: number;
    ticker_info: TickerInfo;
}

export async function shareInfoEndpoint(
    request: ShareInfoRequest,
): Promise<ShareInfoResponse> {
    const url = apiURL + request.share;
    const res = await axios.post(url);
    return res.data;
}
