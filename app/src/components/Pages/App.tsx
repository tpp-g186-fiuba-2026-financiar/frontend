import { useEffect, useState } from 'react';
import '../../css/App.css';
import SignUpPopUp from '../SignUp/SignUpPopUp';
import { helloEndpoint, type Introduction } from '../../api/hello';
import LoginPopUp from '../Login/LoginPopUp';

function App() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [introduction, setIntroduction] = useState<Introduction | null>(null);
    const [isSignUpOpen, setIsSignUpOpen] = useState<boolean>(false);
    const [isLoginOpen, setIsLoginOpen] = useState<boolean>(false);

    useEffect(() => {
        helloEndpoint(setIntroduction, setError, setLoading);
    }, []);

    if (loading) return <p>Loading...</p>;
    if (error) return <p>Error: {error}</p>;
    return (
        <>
            <div className="p-1"></div>
            <div className="container text-center">
                <div className="row align-items-center">
                    <div className="col text-start">
                        <span className="wordmark">
                            <span className="grad">Financi</span>Ar
                        </span>
                    </div>
                    <div className="col">
                        <button
                            className="btn btn-primary me-2"
                            onClick={() => setIsSignUpOpen(true)}
                        >
                            Sign up
                        </button>
                        <button
                            className="btn btn-outline-light"
                            onClick={() => setIsLoginOpen(true)}
                        >
                            Login
                        </button>
                    </div>
                </div>
                <SignUpPopUp
                    isOpen={isSignUpOpen}
                    onClose={() => setIsSignUpOpen(false)}
                />
                <LoginPopUp
                    isOpen={isLoginOpen}
                    onClose={() => setIsLoginOpen(false)}
                />
            </div>
            <div className="p-1"></div>
            <div className="row">
                <h3>{introduction?.message}</h3>
            </div>
        </>
    );
}

export default App;
