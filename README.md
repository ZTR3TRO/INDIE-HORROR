# 🎮 INDIE HORROR GAME

Juego de terror indie en 3D low-poly desarrollado con Three.js

## 📋 Requisitos

- Node.js instalado (v18 o superior) ✅ YA LO TIENES
- VSCode (recomendado)

## 🚀 Instalación y Ejecución

### Paso 1: Preparar archivos

1. Asegúrate de que estos archivos estén en tu carpeta `INDIE-HORROR`:
   - `package.json`
   - `index.html`
   - `style.css`
   - `game.js`
   - `README.md`
   - **`House interior.glb`** ← ¡IMPORTANTE! Tu modelo 3D

### Paso 2: Instalar dependencias

Abre la terminal en VSCode (o Terminal normal) dentro de la carpeta `INDIE-HORROR` y ejecuta:

```bash
npm install
```

Esto instalará Three.js y Vite.

### Paso 3: Ejecutar el juego

En la misma terminal, ejecuta:

```bash
npm run dev
```

Verás algo como:

```
  VITE v5.0.0  ready in 500 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

### Paso 4: Abrir en el navegador

Abre tu navegador y ve a: **http://localhost:5173/**

¡Listo! El juego debería estar funcionando.

## 🎮 Controles

- **WASD** o **Flechas** - Movimiento
- **Mouse** - Mirar alrededor
- **ESC** - Pausar/Salir del juego
- **Click en "COMENZAR"** - Iniciar

## 🔧 Solución de Problemas

### El modelo no se carga
- Verifica que `House interior.glb` esté en la misma carpeta que `index.html`
- El nombre debe ser exactamente: `House interior.glb` (con espacio)

### Error al ejecutar npm
- Asegúrate de estar en la carpeta correcta: `cd INDIE-HORROR`
- Verifica que Node.js esté instalado: `node --version`

### Pantalla negra
- Abre la consola del navegador (F12) y revisa si hay errores
- Verifica que el modelo se haya cargado correctamente

## 📁 Estructura del Proyecto

```
INDIE-HORROR/
├── package.json          # Configuración del proyecto
├── index.html            # Página principal
├── style.css             # Estilos del juego
├── game.js               # Lógica del juego
├── House interior.glb    # Modelo 3D de la casa
└── README.md             # Este archivo
```

## 🎨 Próximos Pasos

1. **Agregar props** - Descarga muebles y objetos individuales para decorar
2. **Efectos de sonido** - Añade audio ambiental y jumpscares
3. **Mecánicas** - Implementa objetivos (encontrar llaves, resolver puzzles)
4. **Enemigos** - Agrega entidades que persigan al jugador

## 🆘 ¿Necesitas Ayuda?

Si algo no funciona, revisa:
1. La consola del navegador (F12)
2. La terminal donde ejecutaste `npm run dev`
3. Que todos los archivos estén en la carpeta correcta

---

**¡Diviértete creando tu juego de terror! 👻**
