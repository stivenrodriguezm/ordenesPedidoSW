# Servidor local de desarrollo

Acceso recomendado desde el Mac o un celular en la misma Wi-Fi:
**http://stivens-macbook-air.local:3000**. El router cambia la IP al cambiar de
red; no reutilizar una dirección de otra subred. El frontend permite
explícitamente ese nombre Bonjour y escucha en todas las interfaces. El API
y los archivos usan los proxies relativos `/api` y `/media` hacia
`127.0.0.1:8000`; no exponer Django directamente a la red.

Los LaunchAgents del usuario `com.lottus.dev.frontend` y
`com.lottus.dev.backend` inician los servicios al entrar a la sesión y los
reinician si terminan. Sirven los checkouts de `modificar_lista`.
`com.lottus.dev.awake` ejecuta `caffeinate -i -s` para evitar suspensión por
inactividad sin mantener la pantalla encendida. Su plantilla está junto a
este documento y está instalada en `~/Library/LaunchAgents/`.

El Mac debe estar encendido, con la sesión iniciada, conectado a la red y
con la tapa abierta. Apagarlo, suspenderlo manualmente, cerrar la tapa o
una Wi-Fi que aísle sus dispositivos puede impedir el acceso. No hay una
IP privada fija que funcione en todas las redes Wi-Fi.

Antes de reiniciar servicios, comprobar nombre local, IP actual, escucha
del puerto y `/api/health/`. No detener el puerto 3000 para pruebas. No
desactivar el firewall ni cambiar la configuración del router para ocultar
un problema de IP. No publicar este servidor de desarrollo en Internet.
