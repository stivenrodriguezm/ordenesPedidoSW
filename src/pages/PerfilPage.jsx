import { useState, useEffect } from "react";
import axios from "axios";
import { FaCircleUser } from "react-icons/fa6";
import "./PerfilPage.css";

function PerfilPage() {
  const [user, setUser] = useState({ first_name: "", last_name: "" });
  const [passwords, setPasswords] = useState({
    actual: "",
    nueva: "",
    confirmar: "",
  });
  const [mensaje, setMensaje] = useState("");
  const [isError, setIsError] = useState(false); // Nuevo estado para manejar si el mensaje es de error o éxito

  // Peticion a API para obtener nombre y apellido del usuario en cada renderizado
  useEffect(() => {
    const token = localStorage.getItem("accessToken");

    const fetchUser = async () => {
      try {
        const response = await axios.get("https://api.muebleslottus.com/api/user/", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUser({
          first_name: response.data.first_name,
          last_name: response.data.last_name,
        });
      } catch (error) {
        console.error("Error obteniendo datos del usuario:", error);
      }
    };

    fetchUser();
  }, []);

  const handleChange = (e) => {
    setPasswords({ ...passwords, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (passwords.nueva !== passwords.confirmar) {
      setMensaje("Las contraseñas nuevas no coinciden.");
      setIsError(true);
      return;
    }

    const token = localStorage.getItem("accessToken");

    try {
      const response = await axios.post(
        "https://api.muebleslottus.com/api/cambiar-contrasena/",
        {
          old_password: passwords.actual,
          new_password: passwords.nueva,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setMensaje("Contraseña actualizada correctamente.");
      setIsError(false);
      // Limpiar los campos después de un cambio exitoso
      setPasswords({ actual: "", nueva: "", confirmar: "" });
    } catch (error) {
      setMensaje("Error al actualizar la contraseña. Verifica los datos.");
      setIsError(true);
      console.error("Error cambiando la contraseña:", error);
    }
  };

  return (
    <div className="perfil-page">
      <main>
        <div className="perfil-container">
          <h2>Perfil de Usuario</h2>
          <div className="user-icon">
            <FaCircleUser size={80} />
          </div>
          <p className="user-name">{`${user.first_name} ${user.last_name}`}</p>

          <h3>Cambiar Contraseña</h3>
          {mensaje && (
            <p className={`mensaje ${isError ? "error" : "exito"}`}>{mensaje}</p>
          )}

          <form className="formPerfil" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="actual">Contraseña Actual:</label>
              <input
                type="password"
                id="actual"
                name="actual"
                value={passwords.actual}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="nueva">Nueva Contraseña:</label>
              <input
                type="password"
                id="nueva"
                name="nueva"
                value={passwords.nueva}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirmar">Confirmar Nueva Contraseña:</label>
              <input
                type="password"
                id="confirmar"
                name="confirmar"
                value={passwords.confirmar}
                onChange={handleChange}
                required
              />
            </div>

            <button type="submit">Actualizar Contraseña</button>
          </form>
        </div>
      </main>
    </div>
  );
}

export default PerfilPage;