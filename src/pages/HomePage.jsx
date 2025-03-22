import { useEffect, useState } from "react";
import AccesosRapidos from "./AccesosRapidos";
import axios from "axios";

function HomePage() {
  const [userRole, setUserRole] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("accessToken");

    const fetchUserRole = async () => {
      try {
        const response = await axios.get("https://api.muebleslottus.com/api/user/", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUserRole(response.data.role);
      } catch (error) {
        console.error("Error fetching user role:", error);
      }
    };

    fetchUserRole();
  }, []);

  return (
    <div>
      <AccesosRapidos userRole={userRole} />
    </div>
  );
}

export default HomePage;
