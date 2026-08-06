import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FaUser, FaLock, FaArrowRight, FaExclamationCircle, FaEye, FaEyeSlash } from 'react-icons/fa';
import { AppContext } from '../AppContext';
import API_BASE_URL from '../apiConfig';
import './LoginPage.css';

const LoginPage = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { setUsuario, setIsLoggingIn, reloadUser } = useContext(AppContext);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const response = await axios.post(`${API_BASE_URL}/token/`, {
                username,
                password,
            });

            const accessToken = response.data.access;
            const refreshToken = response.data.refresh;

            localStorage.setItem('accessToken', accessToken);
            localStorage.setItem('refreshToken', refreshToken);

            // Actualizar inmediatamente el perfil del usuario en el contexto
            if (reloadUser) {
                await reloadUser();
            } else {
                const userRes = await axios.get(`${API_BASE_URL}/user/`, {
                    headers: { Authorization: `Bearer ${accessToken}` }
                });
                if (setUsuario) {
                    setUsuario(userRes.data);
                }
            }

            setIsLoggingIn(true);

            setTimeout(() => {
                navigate('/');
            }, 800);

        } catch (err) {
            console.error("Login failed:", err);
            setError('Usuario o contraseña incorrectos. Por favor, inténtalo de nuevo.');
            setIsLoading(false);
        }
    };

    return (
        <div className="login-minimal-container">
            {/* Fondo con luces de malla ambiental */}
            <div className="ambient-mesh mesh-1"></div>
            <div className="ambient-mesh mesh-2"></div>
            <div className="ambient-mesh mesh-3"></div>

            {/* Tarjeta Glassmorphic Centrada */}
            <div className="login-glass-card">
                <div className="login-card-header">
                    <div className="login-brand-logo">
                        <span>L</span>
                    </div>
                    <h1 className="login-title">LOTTUS</h1>
                    <p className="login-subtitle">Plataforma Administrativa</p>
                </div>

                <form onSubmit={handleSubmit} className="login-minimal-form">
                    <div className="minimal-input-group">
                        <label htmlFor="username">Usuario</label>
                        <div className="minimal-input-wrapper">
                            <FaUser className="input-field-icon" />
                            <input
                                type="text"
                                id="username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="Tu usuario"
                                required
                                autoComplete="username"
                                disabled={isLoading}
                            />
                        </div>
                    </div>

                    <div className="minimal-input-group">
                        <label htmlFor="password">Contraseña</label>
                        <div className="minimal-input-wrapper">
                            <FaLock className="input-field-icon" />
                            <input
                                type={showPassword ? "text" : "password"}
                                id="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Tu contraseña"
                                required
                                autoComplete="current-password"
                                disabled={isLoading}
                            />
                            <button
                                type="button"
                                className="password-eye-btn"
                                onClick={() => setShowPassword(!showPassword)}
                                tabIndex={-1}
                            >
                                {showPassword ? <FaEyeSlash /> : <FaEye />}
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div className="minimal-error-badge">
                            <FaExclamationCircle className="error-icon" />
                            <span>{error}</span>
                        </div>
                    )}

                    <button type="submit" className="login-primary-btn" disabled={isLoading}>
                        {isLoading ? (
                            <div className="btn-spinner-loader"></div>
                        ) : (
                            <>
                                <span>Ingresar</span>
                                <FaArrowRight className="btn-arrow-icon" />
                            </>
                        )}
                    </button>
                </form>

                <div className="login-card-footer">
                    <span>Lottus ERP &copy; 2026</span>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
