import authAxios from '../authFetch';

const ENDPOINT = '/user/shares/portfolio/recomendacion';
const apiURL = import.meta.env.VITE_SERVER_API + ENDPOINT;

export interface PortfolioRecomendacionResponse {
    pesos_recomendados: Record<string, number>;
}

export async function getPortfolioRecomendacionEndpoint(): Promise<PortfolioRecomendacionResponse> {
    const res = await authAxios.get<PortfolioRecomendacionResponse>(apiURL);
    return res.data;
}
