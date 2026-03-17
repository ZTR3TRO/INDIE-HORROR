const { app, BrowserWindow, shell } = require('electron');
const path = require('path');

const isDev = !app.isPackaged;

function createWindow() {
    const win = new BrowserWindow({
        width: 1280,
        height: 720,
        fullscreen: false,
        resizable: true,
        title: 'NIGHTFALL',
        icon: path.join(__dirname, '../assets/images/zada.png'),
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
        },
    });

    // En desarrollo carga el servidor de Vite, en producción carga el build
    if (isDev) {
        win.loadURL('http://localhost:5173');
        // win.webContents.openDevTools(); // descomentar para debug
    } else {
        win.loadFile(path.join(__dirname, '../dist/index.html'));
    }

    // Abrir links externos en el browser del sistema
    win.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
    });
}

app.whenReady().then(() => {
    createWindow();
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});
