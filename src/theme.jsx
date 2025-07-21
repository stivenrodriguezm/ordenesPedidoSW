import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    primary: {
      main: "#1976d2", // Azul predeterminado de MUI
    },
    secondary: {
      main: "#f50057", // Rosa fuerte
    },
    background: {
      default: "#f4f4f4",
      paper: "#ffffff",
    },
  },
  typography: {
    fontFamily: "Roboto, Arial, sans-serif",
    h1: {
      fontSize: "2rem",
      fontWeight: 600,
    },
    button: {
      textTransform: "none",
    },
  },
});

export default theme;
/** 

tengo un proyecto ya bien avanzado el cual es una plataforma para una empresa de muebles y la idea es administrar desde aca varias cosas. 



te dare gran parte del codigo frontend para que entiendas el estilo de las paginas y tambien el codigo backend para que entiendas la logica y puedas ayudarme a continuar con el proyecto.



Frontend: react. Backend: django. 



FRONTEND:



/src

     /assets

     /components

     /hooks

     /pages

     /services

     App.jsx

     AppContext.jsx

     index.css

     main.jsx

     PrivateRoute.jsx

     theme.jsx**/