import authAxios from '../authFetch';

const apiURL = `${import.meta.env.VITE_SERVER_API}/user/preferences`;

export async function deleteUserPreferenceEndpoint(
    stock: string,
): Promise<void> {
    await authAxios.delete(`${apiURL}/${stock}`);
}
