import authAxios from '../authFetch';
const ENDPOINT = '/user';
const apiURL = import.meta.env.VITE_SERVER_API + ENDPOINT;

export interface UserResponse {
    id: number;
    email: string;
    full_name: string;
    risk_profile: string;
    is_active: boolean;
    created_at: string;
}

export async function getUserEndpoint(
): Promise<UserResponse> {
    const res = await authAxios.get(apiURL);
    return res.data;
}