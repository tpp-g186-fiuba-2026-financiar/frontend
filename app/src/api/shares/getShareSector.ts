import axios from 'axios';

const apiURL = import.meta.env.VITE_SERVER_API;

export interface ShareSectorRequest {
	share_name: string;
}

export async function shareSectorEndpoint(
	request: ShareSectorRequest,
): Promise<unknown> {
	const url = `${apiURL}/shares/${request.share_name}/sector`;
	const res = await axios.get(url);
	return res.data;
}
