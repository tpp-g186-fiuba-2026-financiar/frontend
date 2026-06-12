import authAxios from '../authFetch';
const ENDPOINT = '/user/shares';
const apiURL = import.meta.env.VITE_SERVER_API + ENDPOINT;

export interface AddUserShareRequest {
    ticker: string;
    quantity: number;
}

export interface AddUserShareResponse {
    id: number;
    user_id: number;
    ticker: string;
    quantity: number;
    creater_at: Date;
}

export async function addUserShareEndpoint(
    request: AddUserShareRequest,
): Promise<AddUserShareResponse> {
    const res = await authAxios.post<AddUserShareResponse>(apiURL, request);
    return res.data;
}
