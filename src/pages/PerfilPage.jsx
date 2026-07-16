import React, { useState, useContext } from 'react';
import { AppContext } from '../AppContext';
import API from '../services/api';
import { 
    FaCheckCircle, 
    FaExclamationCircle, 
    FaUser, 
    FaLock, 
    FaShieldAlt, 
    FaSpinner,
    FaIdBadge
} from 'react-icons/fa';
import './PerfilPage.css';

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

    const roleText = usuario?.role || 'Usuario';
    const fullName = `${usuario?.first_name || ''} ${usuario?.last_name || ''}`.trim() || 'Usuario Desconocido';
    const username = usuario?.username || 'usuario';

    return (
        <div className="page-container perfil-container">
            <div className="perfil-grid">
                {/* Left Column: User Overview */}
                <div className="perfil-card">
                    <div className="perfil-avatar">
                        {getInitials(usuario?.first_name, usuario?.last_name)}
                    </div>
                    
                    <div className="perfil-info">
                        <h3>{fullName}</h3>
                        <p>@{username}</p>
                        
                        <div className="perfil-badge">
                            <FaIdBadge />
                            {roleText.charAt(0).toUpperCase() + roleText.slice(1)}
                        </div>
                    </div>

                    <h4 style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem', textTransform: 'uppercase', marginBottom: '1rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <FaUser /> Detalles de la Cuenta
                    </h4>
                    
                    <ul className="perfil-details-list">
                        <li>
                            <span className="detail-label">Estado</span>
                            <span className="badge-active">Activo</span>
                        </li>
                        <li>
                            <span className="detail-label">Cuenta</span>
                            <span className="detail-value">{username}</span>
                        </li>
                        <li>
                            <span className="detail-label">Rol Asignado</span>
                            <span className="detail-value">{roleText.charAt(0).toUpperCase() + roleText.slice(1)}</span>
                        </li>
                    </ul>
                </div>

                {/* Right Column: Security Settings */}
                <div className="perfil-card">
                    <div className="perfil-card-header">
                        <div className="perfil-icon-bg">
                            <FaShieldAlt />
                        </div>
                        <div>
                            <h2>Seguridad de la Cuenta</h2>
                            <p>Actualiza tu contraseña periódicamente para mayor protección.</p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label htmlFor="oldPassword">
                                <FaLock style={{ marginRight: '0.5rem', color: 'var(--color-text-placeholder)' }} />
                                Contraseña Actual
                            </label>
                            <input 
                                type="password"
                                id="oldPassword"
                                value={oldPassword}
                                onChange={(e) => setOldPassword(e.target.value)}
                                placeholder="Ingresa tu contraseña actual"
                                required 
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="newPassword">
                                <FaLock style={{ marginRight: '0.5rem', color: 'var(--color-text-placeholder)' }} />
                                Nueva Contraseña
                            </label>
                            <input 
                                type="password"
                                id="newPassword"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="Ingresa la nueva contraseña"
                                required 
                            />
                            <small style={{ color: 'var(--color-text-placeholder)', display: 'block', marginTop: '0.5rem' }}>
                                La contraseña debe tener al menos 8 caracteres.
                            </small>
                        </div>

                        <div className="form-group">
                            <label htmlFor="confirmPassword">
                                <FaLock style={{ marginRight: '0.5rem', color: 'var(--color-text-placeholder)' }} />
                                Confirmar Nueva Contraseña
                            </label>
                            <input 
                                type="password"
                                id="confirmPassword"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Repite la nueva contraseña"
                                required 
                            />
                        </div>
                        
                        {notification.message && (
                            <div className={`notification-box ${notification.type}`}>
                                {notification.type === 'success' ? <FaCheckCircle size={20} /> : <FaExclamationCircle size={20} />}
                                <span>{notification.message}</span>
                            </div>
                        )}

                        <div style={{ marginTop: '2rem' }}>
                            <button 
                                type="submit" 
                                className="btn-primary"
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <>
                                        <FaSpinner className="loader" style={{ width: '20px', height: '20px', borderWidth: '2px', marginBottom: 0, animation: 'spin 1s linear infinite' }} />
                                        Actualizando...
                                    </>
                                ) : (
                                    'Actualizar Contraseña'
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default PerfilPage;
