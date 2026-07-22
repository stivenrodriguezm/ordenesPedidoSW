# Guía de Despliegue en Producción - Frontend React/Vite (`app.muebleslottus.com`)

Esta guía describe el procedimiento oficial para desplegar el frontend compilado de **Lottus** en el servidor vía SSH con el dominio `https://app.muebleslottus.com`.

---

## 1. Compilación del Frontend (Local o CI/CD)

En tu máquina local, compila los archivos de producción apuntando a la API de producción:

```bash
npm run build
```

Esto generará la carpeta comprimida y optimizada `dist/`.

---

## 2. Transferencia de Archivos al Servidor vía SSH

Transfiere el contenido compilado de la carpeta `dist/` hacia el servidor SSH en la ruta `/var/www/app.muebleslottus.com`:

```bash
# Crear el directorio en el servidor SSH (si no existe)
ssh ubuntu@app.muebleslottus.com "sudo mkdir -p /var/www/app.muebleslottus.com && sudo chown -R \$USER:\$USER /var/www/app.muebleslottus.com"

# Copiar los archivos compilados
rsync -avz --delete dist/ ubuntu@app.muebleslottus.com:/var/www/app.muebleslottus.com/
```

---

## 3. Configurar Nginx para Single Page Application (SPA)

En el servidor SSH `app.muebleslottus.com`, crea la configuración de Nginx:

```bash
sudo nano /etc/nginx/sites-available/app.muebleslottus.com
```

Pega el siguiente bloque de configuración:

```nginx
server {
    server_name app.muebleslottus.com;

    root /var/www/app.muebleslottus.com;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Caché estático optimizado para assets compilados
    location ~* \.(?:css|js|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
}
```

Activa el sitio en Nginx y reinicia el servicio:

```bash
sudo ln -s /etc/nginx/sites-available/app.muebleslottus.com /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## 4. Habilitar SSL (HTTPS) con Certbot

Asegura el dominio obteniendo un certificado SSL gratuito:

```bash
sudo certbot --nginx -d app.muebleslottus.com
```

---

## 5. Verificación de Comunicación con el Backend

1. Abre `https://app.muebleslottus.com` en tu navegador.
2. Inicia sesión. Todas las solicitudes HTTP enviadas por Axios utilizarán automáticamente la URL base:
   `https://api.muebleslottus.com/api`
