import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FaCheckCircle, FaTimes } from 'react-icons/fa';
import './AppNotification.css';

const AppNotification = ({ message, type, onClose }) => {
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        onClose();
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [message, onClose]);

  if (!message) {
    return null;
  }

  return createPortal(
    <div className={`app-toast app-toast--visible app-toast--${type}`}>
      {type === 'success' ? <FaCheckCircle className="app-toast-icon" /> : <FaTimes className="app-toast-icon" />}
      <span className="app-toast-msg">{message}</span>
      <button onClick={onClose} className="app-toast-close"><FaTimes /></button>
    </div>,
    document.body
  );
};

export default AppNotification;