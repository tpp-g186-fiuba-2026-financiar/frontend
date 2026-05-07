import { useEffect, useState } from 'react';
import '../../css/App.css';
import SignUpPopUp from '../SignUp';
import { helloEndpoint, type Introduction } from '../../schemas/hello';


function App() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [introduction, setIntroduction] = useState<Introduction | null>(null);
    const [isOpen, setIsOpen] = useState<boolean>(false);
    useEffect(() => {
        helloEndpoint(setIntroduction, setError, setLoading)
    }, []);

    if (loading) return <p>Loading...</p>;
    if (error) return <p>Error: {error}</p>;
    return (
        <>
            <div className="p-1"></div>
            <div className="container text-center">
                <div className="row align-items-start">
                    <div className="col-9"></div>
                    {/* <div className="col">
                        <button className= "btn btn-success"onClick={() => setIsOpen(true)}>Login</button>
                    </div> */}
                    <div className="col">
                        <button
                            className="btn btn-success"
                            onClick={() => setIsOpen(true)}
                        >
                            Sign up
                        </button>
                    </div>
                </div>
                <SignUpPopUp isOpen={isOpen} onClose={() => setIsOpen(false)} />
            </div>
            <div className="p-1"></div>
            <div className="row">
                <h1 className="dark">Welcome to Financiar!</h1>
                <h3>{introduction?.message}</h3>
            </div>
        </>
    );
}

export default App;