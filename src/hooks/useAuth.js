// useAuth.js (nuevo hook para manejar autenticación)
import { useState, useEffect } from 'react';

function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  useEffect(() => {
    const token = localStorage.getItem('token');
    setIsAuthenticated(!!token);
  }, []);
  
  return { isAuthenticated };
}

export default useAuth;