// LoginPage.jsx
import { useState, useContext } from "react"; // Importa useContext
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import "./LoginPage.css";
import { AppContext } from "../AppContext"; // Importa AppContext

function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { setUsuario } = useContext(AppContext); // Obtiene setUsuario del contexto

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await API.post("token/", { username, password });
      localStorage.setItem("accessToken", response.data.access);
      localStorage.setItem("refreshToken", response.data.refresh);
      const userResponse = await API.get("user/");
      const role = userResponse.data.role;
      localStorage.setItem("userRole", role);
      setUsuario(userResponse.data); // Actualiza el estado del usuario en el contexto
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
