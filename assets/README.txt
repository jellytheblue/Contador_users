CONTADOR DE USUARIOS — VERSIÓN WEB

Archivos:
- index.html   Estructura de la aplicación.
- styles.css   Diseño visual y adaptación a pantallas pequeñas.
- app.js       Grupos, usuarios, interruptores, guardado y temporizador.

CÓMO ABRIRLO
1. Descomprime la carpeta (si descargaste el ZIP).
2. Abre index.html con Chrome, Edge o Firefox.
3. No requiere Python, servidor ni instalación de dependencias.

DATOS
La aplicación guarda automáticamente los cambios en localStorage del navegador.
Los datos permanecen en ese navegador y en ese perfil de usuario. No se sincronizan
entre equipos ni entre navegadores. No borres los datos del sitio si quieres conservarlos.

FUNCIONES
- Crear, seleccionar, renombrar y eliminar grupos.
- Agregar, renombrar y eliminar usuarios/personajes.
- Marcar individualmente cada personaje como activo o inactivo.
- Contador global de usuarios activos y registrados.
- Reinicio automático de todos los interruptores, configurable entre 0,5 y 720 horas.
- Guardado automático y botón para guardar manualmente.

NOTA SOBRE EL REINICIO
El temporizador usa la fecha y hora del equipo. Si el navegador se cierra y el plazo
vence durante ese tiempo, el reinicio se ejecutará al volver a abrir la aplicación.
