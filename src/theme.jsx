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
