import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import QRCodeGenerator from '../qr/qr';
import io from 'socket.io-client';
import './chatapp.css';
import img1 from '../../Assets/icons/img1.png';
import img2 from '../../Assets/icons/img2.png';
import img3 from '../../Assets/icons/img3.png';
import img4 from '../../Assets/icons/img4.png';
import img5 from '../../Assets/icons/img5.png';
import img6 from '../../Assets/icons/img6.png';
import img7 from '../../Assets/icons/img7.png';
import img8 from '../../Assets/icons/img8.png';
import img9 from '../../Assets/icons/img9.png';
import { Menu, X, Send, LogOut, QrCode, Image as ImageIcon } from 'lucide-react';

let socket;

function Chatapp() {
    const location = useLocation();
    const navigate = useNavigate();
    const { username, room, random } = location.state || {};
    const [messages, setMessages] = useState([]);
    const [message, setMessage] = useState('');
    const rand = [img1, img2, img3, img4, img5, img6, img7, img8, img9];
    const [users, setUsers] = useState([]);
    const [qrShow, setQr] = useState(false);
    const [isNavbarOpen, setIsNavbarOpen] = useState(false);
    const messagesEndRef = useRef(null);
    const messagesContainerRef = useRef(null);
    const fileInputRef = useRef(null);

    // Format current time for messages
    const formatTime = () => {
        const now = new Date();
        return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    // Initialize socket and handle events
    useEffect(() => {
        socket = io(process.env.REACT_APP_SERVER_URL || 'http://localhost:5000');

        socket.emit('joinRoom', { username, room });

        socket.on('previousMessages', (previousMessages) => {
            setMessages(previousMessages.map(msg => ({
                ...msg,
                time: msg.time || formatTime()
            })));
        });

        socket.on('User', (user) => {
            setUsers(user);
        });

        socket.on('message', (message) => {
            console.log('Received message:', message); // Debug log
            setMessages((messages) => [...messages, {
                ...message,
                time: formatTime()
            }]);
        });

        // Check if navbar should be open by default on desktop
        const handleResize = () => {
            if (window.innerWidth > 768) {
                setIsNavbarOpen(true);
            } else {
                setIsNavbarOpen(false);
            }
        };

        // Initialize correct state
        handleResize();

        // Add event listener
        window.addEventListener('resize', handleResize);

        return () => {
            socket.disconnect();
            socket.off();
            window.removeEventListener('resize', handleResize);
        };
    }, [username, room]);

    // Scroll to the latest message when messages update
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    if (!username || !room) {
        navigate('/', { replace: true });
        return (<div className="unauthorized-access">
            <h1>Please Login to Continue</h1>
            <button onClick={() => navigate('/')}>Go to Login</button>
        </div>);
    }

    // Send message handler
    const sendMessage = (e) => {
        e.preventDefault();
        if (message.trim()) {
            socket.emit('sendMessage', { text: message.trim(), image: null });
            setMessage('');
        }
    };

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 1024 * 1024) { // 1MB limit
                alert("Image is too large. Max size is 1MB.");
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result;
                socket.emit('sendMessage', { text: '', image: base64String });
            };
            reader.readAsDataURL(file);
        }
        // Reset input
        e.target.value = null;
    };

    const triggerFileInput = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    // Handle logout
    const handleLogout = () => {
        setMessages([]);
        setMessage('');
        socket.disconnect();
        socket.off();
        navigate('/', { replace: true });
    };

    // Toggle QR code display
    const toggleQr = () => {
        setQr(!qrShow);
    };

    // Toggle navbar visibility
    const toggleNavbar = () => {
        setIsNavbarOpen(!isNavbarOpen);
    };

    // Close sidebar on mobile when clicking outside
    const handleOverlayClick = () => {
        if (window.innerWidth <= 768) {
            setIsNavbarOpen(false);
        }
    };

    // Handle enter key press in input
    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage(e);
        }
    };

    // Render the chat app
    return (
        <div className="chat-body">
            {/* Sidebar Overlay for Mobile */}
            {isNavbarOpen && window.innerWidth <= 768 && (
                <div className="sidebar-overlay active" onClick={handleOverlayClick}></div>
            )}

            {/* Sidebar */}
            <div className={`navbar ${isNavbarOpen ? 'sidebar-visible' : ''}`}>
                <div className="navbar-header">
                    <h2 className="heading0">Chat Room</h2>
                </div>

                {/* User Profile */}
                <div className="user-profile">
                    <img src={rand[random]} alt="Profile" className="logo" />
                    <div className="user-info">
                        <p className="username">{username}</p>
                        <p className="room-id">#{room}</p>
                    </div>
                </div>

                {/* Participants List */}
                <h3 className="header-par">Active Participants</h3>
                <ul className="list-par">
                    {users.map((user, index) => (
                        <li key={index}>{user}</li>
                    ))}
                </ul>

                {/* Sidebar Buttons */}
                <div className="sidebar-buttons">
                    <button className="button qr-btn" onClick={toggleQr}>
                        <QrCode size={18} />
                        {qrShow ? 'Hide QR Code' : 'Show QR Code'}
                    </button>
                    <button className="button logout" onClick={handleLogout}>
                        <LogOut size={18} />
                        Logout
                    </button>
                </div>

                {/* QR Code - now passing username as well */}
                <div className="qr">
                    {qrShow && <QRCodeGenerator roomid={room} username={username} />}
                </div>
            </div>

            {/* Main Chat Area */}
            <div className="chat-container">
                {/* Chat Header */}
                <div className="chat-header">
                    <button className="toggle-btn" onClick={toggleNavbar}>
                        {isNavbarOpen ? (
                            <X className="menu" />
                        ) : (
                            <Menu className="menu" />
                        )}
                    </button>
                    <h1 className="heading">Room: {room}</h1>
                    <div>{users.length} online</div>
                </div>

                {/* Messages Area */}
                <div className="messages-container" ref={messagesContainerRef}>
                    {messages.length === 0 ? (
                        <div className="empty-state">
                            <h3>No messages yet</h3>
                            <p>Be the first to say hello!</p>
                        </div>
                    ) : (
                        messages.map((message, index) => (
                            <div
                                key={index}
                                className={`message ${message.user === username ? 'user' : ''
                                    }`}
                            >
                                <p className="username-col">{message.user}</p>
                                {message.image && (
                                    <img
                                        src={message.image}
                                        alt="Shared content"
                                        className="shared-image"
                                        onError={(e) => {
                                            e.target.onerror = null;
                                            e.target.style.display = 'none';
                                            e.target.parentElement.innerHTML += '<p style="color:red;font-size:12px">[Image failed to load]</p>';
                                        }}
                                    />
                                )}
                                {message.text && (
                                    <p>
                                        {typeof message.text === 'string'
                                            ? message.text
                                            : (typeof message.text === 'object' && message.text.text)
                                                ? message.text.text
                                                : ''}
                                    </p>
                                )}
                                <p className="message-time">{message.time}</p>
                            </div>
                        )))}
                    <div ref={messagesEndRef}></div>
                </div>

                {/* Message Input Form */}
                <form className="form-container" onSubmit={sendMessage}>
                    <input
                        type="file"
                        ref={fileInputRef}
                        style={{ display: 'none' }}
                        accept="image/*"
                        onChange={handleImageUpload}
                    />
                    <button type="button" className="icon-btn" onClick={triggerFileInput} title="Send Image">
                        <ImageIcon size={20} />
                    </button>
                    <input
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Type a message..."
                    />
                    <button type="submit">
                        <Send size={18} />
                        Send
                    </button>
                </form>
            </div>
        </div>
    );
}

export default Chatapp;