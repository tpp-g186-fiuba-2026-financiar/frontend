import { useEffect, useState } from "react";
import { getUserEndpoint, type UserResponse } from '../../api/user/getUser';

function Home() {
    const [user, setUser] = useState<UserResponse | null>(null);

    const fetchUser = async () => {
            const u = await getUserEndpoint();
            setUser(u)
        };

    useEffect(() => {
        fetchUser();
    }, []);

    if (!user) {
        return (
            <>
                <div className="p-1"></div>
                <div className="container text-center"></div>
                <div className="p-1"></div>
                <div className="row">
                    <h3 className="dark">Home!</h3>
                </div>
            </>)
    } else {
        return (
            <>
                <div className="p-1"></div>
                <div className="container text-center"></div>
                <div className="p-1"></div>
                <div className="row">
                    <h3 className="dark">Welcome {user.full_name}</h3>
                </div>
            </>
        );
    }
}

export default Home;
