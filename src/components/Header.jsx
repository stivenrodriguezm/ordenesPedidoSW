import { useState, useEffect } from "react";
import axios from "axios";
import { FaCircleUser } from "react-icons/fa6";

function Header() {
  const [user, setUser] = useState({ first_name: "", last_name: "" });

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
        console.error("Error fetching user info:", error);
      }
    };

    fetchUser();
  }, []);

  return (
    <div className="barraSuperior">
      <h1>Proveedores</h1>
      <div className="usuarioBarra">
        <p>{`${user.first_name} ${user.last_name}`}</p>
        <FaCircleUser />
      </div>
    </div>
  );
}

export default Header;
