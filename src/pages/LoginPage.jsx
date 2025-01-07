import { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import "./LoginPage.css";

function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      // Solicitar tokens
      const response = await API.post("token/", { username, password });

      // Guardar los tokens en localStorage
      localStorage.setItem("accessToken", response.data.access);
      localStorage.setItem("refreshToken", response.data.refresh);

      // Obtener información del usuario para determinar el rol
      const userResponse = await API.get("user/");
      const isAdmin = userResponse.data.is_staff;
      localStorage.setItem("isAdmin", isAdmin);

      // Redirigir a la página principal
      navigate("/");
    } catch (err) {
      setError("Credenciales inválidas. Intenta de nuevo.");
    }
  };

  return (
    <div className="login-page">
      <h1>Iniciar Sesión</h1>
      <form onSubmit={handleLogin}>
        <input
          type="text"
          placeholder="Usuario"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit">Entrar</button>
        {error && <p className="error">{error}</p>}
      </form>
    </div>
  );
}

export default LoginPage;
