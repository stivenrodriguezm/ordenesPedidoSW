import React, { useState, useContext } from 'react';
import { AppContext } from '../AppContext';
import API from '../services/api';
import './PerfilPage.css';
import { FaCheckCircle, FaExclamationCircle } from 'react-icons/fa';

const PerfilPage = () => {
    const { usuario } = useContext(AppContext);
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [notification, setNotification] = useState({ message: '', type: '' });
    const [isLoading, setIsLoading] = useState(false);

    const getInitials = (name = '', lastName = '') => {
        const firstNameInitial = name ? name[0] : '';
        const lastNameInitial = lastName ? lastName[0] : '';
        return `${firstNameInitial}${lastNameInitial}`.toUpperCase();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (newPassword !== confirmPassword) {
            setNotification({ message: 'Las nuevas contraseñas no coinciden.', type: 'error' });
            return;
        }

        setIsLoading(true);
        setNotification({ message: '', type: '' });

        try {
            await API.post('/change-password/', {
                old_password: oldPassword,
                new_password: newPassword,
            });
            setNotification({ message: '¡Contraseña actualizada con éxito!', type: 'success' });
            setOldPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (err) {
            setNotification({ message: err.response?.data?.error || 'Ocurrió un error al cambiar la contraseña.', type: 'error' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="perfil-page-container">
            <div className="perfil-card">
                <div className="perfil-card-header">
                    <div className="perfil-avatar">
                        <span>{getInitials(usuario?.first_name, usuario?.last_name)}</span>
                    </div>
                    <h1 className="perfil-user-name">{`${usuario?.first_name} ${usuario?.last_name}`}</h1>
                    <p className="perfil-user-role">{usuario?.role}</p>
                </div>

                <div className="perfil-card-body">
                    <h2 className="form-title">Cambiar Contraseña</h2>
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label htmlFor="oldPassword">Contraseña Actual</label>
                            <input 
                                type="password"
                                id="oldPassword"
                                value={oldPassword}
                                onChange={(e) => setOldPassword(e.target.value)}
                                required 
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="newPassword">Nueva Contraseña</label>
                            <input 
                                type="password"
                                id="newPassword"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required 
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="confirmPassword">Confirmar Nueva Contraseña</label>
                            <input 
                                type="password"
                                id="confirmPassword"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required 
                            />
                        </div>
                        
                        {notification.message && (
                            <div className={`notification-banner ${notification.type}`}>
                                {notification.type === 'success' ? <FaCheckCircle /> : <FaExclamationCircle />}
                                <span>{notification.message}</span>
                            </div>
                        )}

                        <button type="submit" className="submit-button" disabled={isLoading}>
                            {isLoading ? 'Actualizando...' : 'Actualizar Contraseña'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default PerfilPage;
