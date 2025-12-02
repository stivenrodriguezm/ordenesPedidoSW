import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FaUser, FaLock, FaArrowRight } from 'react-icons/fa';
import { AppContext } from '../AppContext';
import API_BASE_URL from '../apiConfig';
import './LoginPage.css';

const LoginPage = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { setUsuario, setIsLoggingIn } = useContext(AppContext);
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

            localStorage.setItem('accessToken', response.data.access);
            localStorage.setItem('refreshToken', response.data.refresh);

            // Activar el loader de Lottus
            setIsLoggingIn(true);

            // Simular una carga y luego navegar
            setTimeout(() => {
                // La verificación del usuario se hará en AppContext
                navigate('/');
                // No es necesario desactivar el loader aquí, se hará en App.jsx
            }, 2500); // Duración de la animación del loader

        } catch (err) {
            setError('Usuario o contraseña incorrectos. Inténtalo de nuevo.');
            setIsLoading(false);
        }
    };

    return (
        <div className="login-page-container">
            <div className="login-panel-left">
                <div className="login-brand-content">
                    <h1 className="login-brand-title">LOTTUS</h1>
                    <p className="login-brand-subtitle">Plataforma Administrativa</p>
                    <div className="login-decorative-line"></div>
                </div>
            </div>
            <div className="login-panel-right">
                <div className="login-form-wrapper">
                    <div className="login-form-header">
                        <h2>¡Bienvenido!</h2>
                        <p className="login-form-intro">Inicia sesión para continuar</p>
                    </div>
                    <form onSubmit={handleSubmit} className="login-form">
                        <div className="form-group">
                            <label htmlFor="username">Usuario</label>
                            <div className="input-wrapper">
                                <FaUser className="input-icon" />
                                <input
                                    type="text"
                                    id="username"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    placeholder="Ingresa tu usuario"
                                    required
                                    disabled={isLoading}
                                />
                            </div>
                        </div>
                        <div className="form-group">
                            <label htmlFor="password">Contraseña</label>
                            <div className="input-wrapper">
                                <FaLock className="input-icon" />
                                <input
                                    type="password"
                                    id="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Ingresa tu contraseña"
                                    required
                                    disabled={isLoading}
                                />
                            </div>
                        </div>
                        {error && <div className="error-message"><span>⚠️</span> {error}</div>}
                        <button type="submit" className="login-submit-button" disabled={isLoading}>
                            {isLoading ? (
                                <>
                                    Verificando...
                                </>
                            ) : (
                                <>
                                    Iniciar Sesión <FaArrowRight className="button-icon" />
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
