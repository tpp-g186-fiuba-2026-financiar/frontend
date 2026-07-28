import authAxios from '../authFetch';
const ENDPOINT = '/user/shares';
const apiURL = import.meta.env.VITE_SERVER_API + ENDPOINT;

export interface UpdateUserShareRequest {
    quantity: number;
}

export interface UpdateUserShareResponse {
    id: number;
    user_id: number;
    ticker: string;
    quantity: number;
    created_at: string;
}

export async function updateUserShareEndpoint(
    id: number,
    request: UpdateUserShareRequest,
): Promise<UpdateUserShareResponse> {
    const res = await authAxios.put<UpdateUserShareResponse>(
        `${apiURL}/${id}`,
        request,
    );
    return res.data;
}
