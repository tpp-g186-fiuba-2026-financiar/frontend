import authAxios from '../authFetch';
const ENDPOINT = '/user/risk-profile';
const apiURL = import.meta.env.VITE_SERVER_API + ENDPOINT;
export interface ProfileUpdateRequest {
    risk_profile: string;
}

export interface ProfileUpdateResponse {
    code: number;
    message: string;
}

export async function updateProfileEndpoint(
    request: ProfileUpdateRequest,
): Promise<ProfileUpdateResponse> {
    const res = await authAxios.patch(apiURL, request);
    return res.data;
}
