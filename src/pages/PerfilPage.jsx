import { useState, useEffect } from "react";
import axios from "axios";
import { FaCircleUser } from "react-icons/fa6";
import "./PerfilPage.css"; // Puedes agregar estilos aquí

function PerfilPage() {
  const [user, setUser] = useState({ first_name: "", last_name: "" });
  const [passwords, setPasswords] = useState({
    actual: "",
    nueva: "",
    confirmar: "",
  });
  const [mensaje, setMensaje] = useState("");

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
    } catch (error) {
      setMensaje("Error al actualizar la contraseña. Verifica los datos.");
      console.error("Error cambiando la contraseña:", error);
    }
  };

  return (
    <div className="perfil-container">
      <h2>Perfil de Usuario</h2>
      <FaCircleUser size={80} />
      <p>{`${user.first_name} ${user.last_name}`}</p>

      <h3>Cambiar Contraseña</h3>
      {mensaje && <p className="mensaje">{mensaje}</p>}
      
      <form onSubmit={handleSubmit}>
        <label>Contraseña Actual:</label>
        <input type="password" name="actual" value={passwords.actual} onChange={handleChange} required />

        <label>Nueva Contraseña:</label>
        <input type="password" name="nueva" value={passwords.nueva} onChange={handleChange} required />

        <label>Confirmar Nueva Contraseña:</label>
        <input type="password" name="confirmar" value={passwords.confirmar} onChange={handleChange} required />

        <button type="submit">Actualizar Contraseña</button>
      </form>
    </div>
  );
}

export default PerfilPage;
