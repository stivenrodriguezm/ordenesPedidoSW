import React, { useEffect } from 'react';
import './AppNotification.css';

const AppNotification = ({ message, type, onClose }) => {
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        onClose();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [message, onClose]);

  if (!message) {
    return null;
  }

  return (
    <div className={`notification ${type}`}>
      <span className="notification-message">{message}</span>
      <button onClick={onClose} className="close-btn">&times;</button>
    </div>
  );
};

export default AppNotification;