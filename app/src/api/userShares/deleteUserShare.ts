import authAxios from '../authFetch';
const ENDPOINT = '/user/shares';
const apiURL = import.meta.env.VITE_SERVER_API + ENDPOINT;

export async function deleteUserShareEndpoint(id: number): Promise<void> {
    await authAxios.delete(`${apiURL}/${id}`);
}
