import { useEffect, useState } from 'react';
import { getUserEndpoint, type UserResponse } from '../../api/user/getUser';
import AddSharePopUp from '../Login/Shares/AddSharePopUp';

function Home() {
    const [user, setUser] = useState<UserResponse | null>(null);
    const [isAddShareOpen, setIsAddShareOpen] = useState<boolean>(false);
    useEffect(() => {
        const fetchUser = async () => {
            const u = await getUserEndpoint();
            setUser(u);
        };
        fetchUser();
    }, []);

    if (!user) {
        return <p>Loading...</p>;
    } else {
        return (
            <>
                <div className="p-1"></div>
                <div className="container text-center"></div>
                <div className="p-1"></div>
                <div className="row justify-content-between">
                    <div className="col-5">
                        <h3 className="dark">Welcome {user.full_name}</h3>
                    </div>
                    <div className="col-2">
                        <button
                            className="btn btn-success"
                            onClick={() => setIsAddShareOpen(true)}
                        >
                            Add Share
                        </button>
                    </div>
                </div>
                <AddSharePopUp
                    isOpen={isAddShareOpen}
                    onClose={() => setIsAddShareOpen(false)}
                />
            </>
        );
    }
}

export default Home;
