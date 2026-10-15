import authAxios from '../authFetch';

const apiURL = `${import.meta.env.VITE_SERVER_API}/user/preferences`;

export interface UserPreferenceRequest {
    model: string;
    stock: string;
}

export async function postUserPreferenceEndpoint(
    request: UserPreferenceRequest,
): Promise<void> {
    await authAxios.post(apiURL, request);
}
