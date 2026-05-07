import axios from "axios";
const ENDPOINT = "/register"
const apiURL = import.meta.env.VITE_SERVER_API + ENDPOINT;
export interface RegisterRequest {
    email: string
    password: string
    full_name: string
    risk_profile: string | null
}


export interface RegisterResponse {
    code: number
    message: string
} 

export async function registerEndpoint(request: RegisterRequest): Promise<RegisterResponse> {
  const res = await axios.post(apiURL, request);
  return res.data;
}