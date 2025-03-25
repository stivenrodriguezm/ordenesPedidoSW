import { useContext } from "react";
import { AppContext } from "../AppContext";
import AccesosRapidos from "./AccesosRapidos";
import "./HomePage.css";

function HomePage() {
  const { usuario } = useContext(AppContext);

  return (
    <div className="homepage">
      <AccesosRapidos userRole={usuario?.role} />
    </div>
  );
}

export default HomePage;