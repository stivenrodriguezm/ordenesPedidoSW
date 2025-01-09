import axios from "axios";

const API = axios.create({
  baseURL: "https://147.93.43.111:8000/api/", // Asegúrate de que termina con una barra
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken"); // Obtén el token de acceso del almacenamiento local
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default API;
