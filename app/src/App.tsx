import { useEffect, useState } from 'react';
import './App.css';
import axios from 'axios';

interface Introduction {
    status: string;
    version: string;
    message: string;
}

function App() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [introduction, setIntroduction] = useState<Introduction | null>(null);
    useEffect(() => {
        const apiURL = import.meta.env.VITE_SERVER_API + '/hello';
        axios
            .get<Introduction>(apiURL)
            .then((res) => setIntroduction(res.data))
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <p>Loading...</p>;
    if (error) return <p>Error: {error}</p>;
    return (
        <>
            <section id="center">
                <div>
                    <h1>Welcome to Financiar!</h1>
                    <h3>{introduction?.message}</h3>
                </div>
            </section>
            <section id="spacer"></section>
        </>
    );
}

export default App;
