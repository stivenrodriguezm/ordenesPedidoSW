// src/pages/LoginPage.jsx
import { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import "./LoginPage.css";
import { AppContext } from "../AppContext";

function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { setUsuario } = useContext(AppContext); // Nota: AppContext no tiene setUsuario actualmente

  // src/pages/LoginPage.jsx (fragmento relevante)
  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    try {
      console.log("Enviando solicitud de login con:", { username, password });
      const response = await API.post("token/", { username, password });
      console.log("Respuesta de token:", response.data);
      localStorage.setItem("accessToken", response.data.access);
      localStorage.setItem("refreshToken", response.data.refresh);

      console.log("Solicitando datos del usuario...");
      const userResponse = await API.get("user/");
      console.log("Datos del usuario:", userResponse.data);

      const role = userResponse.data.role;
      localStorage.setItem("userRole", role);
      setUsuario(userResponse.data); // Esto debería disparar la recarga en AppContext
      navigate("/"); // Redirige después de establecer todo
    } catch (err) {
      console.error("Error en login:", err.response ? err.response.data : err.message);
      setError("Credenciales inválidas. Intenta de nuevo.");
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <h1>Iniciar Sesión</h1>
        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label htmlFor="username">Usuario:</label>
            <input
              type="text"
              id="username"
              placeholder="Ingresa tu usuario"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Contraseña:</label>
            <input
              type="password"
              id="password"
              placeholder="Ingresa tu contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit">Entrar</button>
          {error && <p className="error">{error}</p>}
        </form>
      </div>
    </div>
  );
}

export default LoginPage;