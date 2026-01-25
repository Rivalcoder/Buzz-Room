import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import QRScanner from '../qr/qr-reader';
import { QrCode } from 'lucide-react';
import io from 'socket.io-client';
import "./page.css";

function Page() {
    const [val, setVal] = useState('');
    const [room, setRoom] = useState(''); // For Join input
    const [mode, setMode] = useState('join'); // 'join' or 'create'
    const [generatedRoom, setGeneratedRoom] = useState('');
    const [showScanner, setShowScanner] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Server Check State
    const [serverStatus, setServerStatus] = useState('checking'); // checking, online, offline

    const navigate = useNavigate();
    const random = Math.floor(Math.random() * 9);
    const SERVER_URL = process.env.REACT_APP_SERVER_URL || 'https://messenger-server-9zrr.onrender.com';

    // Check server status on mount
    useEffect(() => {
        const checkServer = async () => {
            try {
                const response = await fetch(SERVER_URL);
                if (response.ok) setServerStatus('online');
                else setServerStatus('offline');
            } catch (e) {
                setServerStatus('offline');
            }
        };
        checkServer();
        // Generate a random room ID for creation mode
        setGeneratedRoom(generateRoomId());

        // Check for ?room=XYZ in URL
        const params = new URLSearchParams(window.location.search);
        const roomParam = params.get('room');
        if (roomParam) {
            setMode('join');
            setRoom(roomParam);
        }
    }, [SERVER_URL]);

    const generateRoomId = () => {
        return Math.random().toString(36).substring(2, 8).toUpperCase();
    };

    const handleRoomDetected = (detectedRoom) => {
        setRoom(detectedRoom);
        setMode('join'); // Switch to join mode if scanned
    };

    const handleConnect = async () => {
        if (!val.trim()) {
            alert('Please enter a username');
            return;
        }

        const targetRoom = mode === 'create' ? generatedRoom : room;

        if (!targetRoom.trim()) {
            alert('Please enter a Room ID');
            return;
        }

        setIsLoading(true);

        // Socket Connection Check
        const socket = io(SERVER_URL);

        const connectionTimeout = setTimeout(() => {
            socket.disconnect();
            setIsLoading(false);
            alert('Server is unreachable. Please try again.');
        }, 5000);

        socket.on('connect', () => {
            clearTimeout(connectionTimeout);

            // If Joining, check if room exists (Optional strict mode)
            // For now, we just proceed as the user requested "Inside go only when server connected"
            // We validated connection.

            // If "Unique Room ID" rule applies:
            if (mode === 'create') {
                // We ask server if room exists. If yes, warn user.
                socket.emit('checkRoom', targetRoom, (exists) => {
                    if (exists) {
                        alert(`Room ID "${targetRoom}" is already active and taken. Please choose a different ID or generate a new one.`);
                        socket.disconnect();
                        setIsLoading(false);
                    } else {
                        proceed(socket, targetRoom);
                    }
                });
            } else {
                // Join Mode - Strict check
                socket.emit('checkRoom', targetRoom, (exists) => {
                    if (!exists) {
                        alert('Room does not exist! Please check the ID or create a new room.');
                        socket.disconnect();
                        setIsLoading(false);
                    } else {
                        proceed(socket, targetRoom);
                    }
                });
            }
        });

        socket.on('connect_error', () => {
            clearTimeout(connectionTimeout);
            socket.disconnect();
            setIsLoading(false);
            alert('Cannot connect to server.');
        });
    };

    const proceed = (socket, targetRoom) => {
        socket.disconnect(); // Disconnect here, real connection happens in /app or /loader
        setIsLoading(false);
        navigate('/loader', { state: { username: val, room: targetRoom, random: random } });
    };

    return (
        <div className="login-container">
            <div className="animated-background"></div>

            <div className="login-card">
                <div className="card-header">
                    <h2>Messenger</h2>
                    <p className="status-text">
                        Server: <span className={serverStatus}>{serverStatus === 'online' ? 'Online' : 'Offline'}</span>
                    </p>
                </div>

                <div className="tabs">
                    <button
                        className={`tab-btn ${mode === 'join' ? 'active' : ''}`}
                        onClick={() => setMode('join')}
                    >
                        Join Room
                    </button>
                    <button
                        className={`tab-btn ${mode === 'create' ? 'active' : ''}`}
                        onClick={() => setMode('create')}
                    >
                        Create Room
                    </button>
                </div>

                <div className="login-form">
                    <div className="input-group">
                        <label>Username</label>
                        <input
                            type="text"
                            className="input-field"
                            placeholder="Enter your name"
                            value={val}
                            onChange={(e) => setVal(e.target.value)}
                        />
                    </div>

                    {mode === 'join' ? (
                        <div className="input-group">
                            <label>Room ID</label>
                            <input
                                type="text"
                                className="input-field"
                                placeholder="Enter Room ID"
                                value={room}
                                onChange={(e) => setRoom(e.target.value)}
                            />
                            <button className="scan-icon-btn" onClick={() => setShowScanner(!showScanner)}>
                                <QrCode size={20} />
                            </button>
                        </div>
                    ) : (
                        <div className="input-group">
                            <label>New Room ID</label>
                            <div className="generated-input">
                                <input
                                    type="text"
                                    className="input-field"
                                    value={generatedRoom}
                                    onChange={(e) => setGeneratedRoom(e.target.value.toUpperCase())}
                                    placeholder="Use ID or type custom"
                                />
                                <button className="refresh-btn" onClick={() => setGeneratedRoom(generateRoomId())}>
                                    ↻
                                </button>
                            </div>
                            <p className="hint">Share this ID with friends</p>
                        </div>
                    )}

                    <button
                        className="btn connect-btn"
                        onClick={handleConnect}
                        disabled={isLoading || serverStatus === 'offline'}
                    >
                        {isLoading ? 'Connecting...' : (mode === 'join' ? 'Join Chat' : 'Start Room')}
                    </button>
                </div>
            </div>

            {showScanner && (
                <QRScanner
                    onClose={() => setShowScanner(false)}
                    onRoomDetected={handleRoomDetected}
                />
            )}
        </div>
    );
}

export default Page;