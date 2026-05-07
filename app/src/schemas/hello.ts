import axios from "axios";
const ENDPOINT= "/hello"
const apiURL = import.meta.env.VITE_SERVER_API + ENDPOINT;

export interface Introduction {
    status: string;
    version: string;
    message: string;
}

export function helloEndpoint(setter: Function, errorSetter: Function, loadingSetter: Function) {
        axios
            .get<Introduction>(apiURL)
            .then((res) => setter(res.data))
            .catch((err) => errorSetter(err.message))
            .finally(() => loadingSetter(false));
}