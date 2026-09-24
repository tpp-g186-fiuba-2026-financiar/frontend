import axios from 'axios';
const ENDPOINT = '/login';
const apiURL = import.meta.env.VITE_SERVER_API + ENDPOINT;
export interface LoginRequest {
    email: string;
    password: string;
    totp_code?: string;
}

export interface LoginResponse {
    code: number;
    message: string;
    token: string;
    two_factor_required?: boolean;
}

export async function loginEndpoint(
    request: LoginRequest,
): Promise<LoginResponse> {
    const res = await axios.post(apiURL, request);
    return res.data;
}
