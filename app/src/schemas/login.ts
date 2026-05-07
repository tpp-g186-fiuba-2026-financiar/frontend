import axios from 'axios';
const ENDPOINT = '/login';
const apiURL = import.meta.env.VITE_SERVER_API + ENDPOINT;
export interface LoginRequest {
    email: string;
    password: string;
}

export interface LoginResponse {
    code: number;
    message: string;
}

export async function loginEndpoint(
    request: LoginRequest,
): Promise<LoginResponse> {
    const res = await axios.post(apiURL, request);
    return res.data;
}
