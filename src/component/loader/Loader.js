import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import "./loader.css";

const Loader = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { username, room, random } = location.state || {};
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        if (!username || !room) {
            navigate('/', { replace: true });
            return;
        }

        const interval = setInterval(() => {
            setProgress(prev => {
                if (prev >= 100) {
                    clearInterval(interval);
                    navigate('/app', { state: { username, room, random }, replace: true });
                    return 100;
                }
                return prev + 5;
            });
        }, 50);

        return () => clearInterval(interval);
    }, [navigate, username, room, random]);

    return (
        <div className='load-body'>
            <div className="loader-content">
                <div className="cube-loader">
                    <div className="cube-face cube-face-front"></div>
                    <div className="cube-face cube-face-back"></div>
                    <div className="cube-face cube-face-right"></div>
                    <div className="cube-face cube-face-left"></div>
                    <div className="cube-face cube-face-top"></div>
                    <div className="cube-face cube-face-bottom"></div>
                </div>
                <div className="progress-container">
                    <div className="progress-bar" style={{ width: `${progress}%` }}></div>
                </div>
                <h2 className='loading-text'>Establishing Secure Connection...</h2>
                <div className="connection-details">
                    <span>Room: {room}</span> | <span>User: {username}</span>
                </div>
            </div>
        </div>
    );
};

export default Loader;