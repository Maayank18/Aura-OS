const { app, BrowserWindow, screen, ipcMain, globalShortcut, Tray, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

// Simple JSON Store
const storePath = path.join(app.getPath('userData'), 'aura-store.json');
const getStore = () => {
  try { return JSON.parse(fs.readFileSync(storePath, 'utf8')); }
  catch (e) { return {}; }
};
const setStore = (val) => fs.writeFileSync(storePath, JSON.stringify(val));

let mainWindow;
let tray;
let store = getStore();

function createWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  const savedBounds = store.bounds || {
    width: 100, // Default closed orb size with enough room for glow
    height: 100,
    x: width - 120,
    y: height - 120
  };

  // Aggressively clamp initial bounds to the screen so it never launches off-screen!
  let safeX = savedBounds.x;
  let safeY = savedBounds.y;
  
  if (safeX < primaryDisplay.workArea.x) safeX = primaryDisplay.workArea.x;
  if (safeY < primaryDisplay.workArea.y) safeY = primaryDisplay.workArea.y;
  if (safeX + savedBounds.width > primaryDisplay.workArea.x + primaryDisplay.workArea.width) {
    safeX = primaryDisplay.workArea.x + primaryDisplay.workArea.width - savedBounds.width;
  }
  if (safeY + savedBounds.height > primaryDisplay.workArea.y + primaryDisplay.workArea.height) {
    safeY = primaryDisplay.workArea.y + primaryDisplay.workArea.height - savedBounds.height;
  }

  mainWindow = new BrowserWindow({
    width: savedBounds.width,
    height: savedBounds.height,
    x: safeX,
    y: safeY,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    hasShadow: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // Force the highest z-index level on Windows so it doesn't vanish during screenshots!
  mainWindow.setAlwaysOnTop(true, 'screen-saver');

  const loadFrontend = () => {
    mainWindow.loadURL('http://localhost:5173/orb-widget').catch((err) => {
      console.log('Frontend not ready, retrying in 2 seconds...');
      setTimeout(loadFrontend, 2000);
    });
  };
  loadFrontend();

  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      store.isVisible = false;
      setStore(store);
    }
  });

  mainWindow.on('moved', () => {
    store.bounds = mainWindow.getBounds();
    setStore(store);
  });
  
  if (store.isVisible === false) {
    // For this prototype, we'll always show on launch so the user isn't confused
    // mainWindow.hide(); 
  }
}

function createTray() {
  const nativeImage = require('electron').nativeImage;
  const icon = nativeImage.createEmpty();
  
  tray = new Tray(icon);
  tray.setToolTip('AuraOS Companion');
  
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Toggle Aura Orb', click: toggleWindow },
    { type: 'separator' },
    { label: 'Quit AuraOS', click: () => {
      app.isQuitting = true;
      app.quit();
    }}
  ]);
  tray.setContextMenu(contextMenu);
  
  tray.on('click', toggleWindow);
}

function toggleWindow() {
  if (!mainWindow) return;
  if (mainWindow.isVisible()) {
    mainWindow.hide();
    store.isVisible = false;
  } else {
    mainWindow.show();
    mainWindow.focus();
    store.isVisible = true;
  }
  setStore(store);
}

app.whenReady().then(() => {
  app.commandLine.appendSwitch('enable-transparent-visuals');
  
  createWindow();
  createTray();

  globalShortcut.register('CommandOrControl+Shift+O', toggleWindow);
  
  globalShortcut.register('CommandOrControl+Shift+M', () => {
    if (mainWindow) mainWindow.webContents.send('global-hotkey', 'toggle-music');
  });
  
  globalShortcut.register('CommandOrControl+Shift+N', () => {
    if (mainWindow) mainWindow.webContents.send('global-hotkey', 'next-music');
  });
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('get-system-state', () => {
  return { battery: '100%' };
});

ipcMain.on('move-window', (event, payload) => {
  try {
    if (!payload || typeof payload !== "object") {
      throw new Error("Invalid payload: must be an object");
    }

    let { dx, dy } = payload;
    
    // Coerce to numbers and validate
    dx = Number(dx);
    dy = Number(dy);
    
    if (!Number.isFinite(dx) || !Number.isFinite(dy)) {
      throw new Error(`Invalid dx or dy. Received dx: ${dx}, dy: ${dy}`);
    }

    if (mainWindow && !mainWindow.isDestroyed()) {
      const bounds = mainWindow.getBounds();
      const newX = Math.round(bounds.x + dx);
      const newY = Math.round(bounds.y + dy);
      mainWindow.setPosition(newX, newY);
    }
  } catch (error) {
    console.error("Error in move-window IPC:", error.message, "Payload:", payload);
  }
});

ipcMain.on('resize-window', (event, payload) => {
  try {
    if (!payload || typeof payload !== "object") {
      throw new Error("Invalid payload: must be an object");
    }

    let { width, height } = payload;
    
    width = Number(width);
    height = Number(height);
    
    if (!Number.isFinite(width) || !Number.isFinite(height)) {
      throw new Error(`Invalid width or height. Received width: ${width}, height: ${height}`);
    }

    if (mainWindow && !mainWindow.isDestroyed()) {
      const bounds = mainWindow.getBounds();
      const display = screen.getDisplayNearestPoint({ x: bounds.x, y: bounds.y });
      
      // Ensure width/height are integers
      width = Math.round(width);
      height = Math.round(height);
      
      let newX = bounds.x;
      let newY = bounds.y;
      
      // Clamp to screen bounds so the panel never expands off-screen in any direction
      if (newX + width > display.workArea.x + display.workArea.width) {
        newX = display.workArea.x + display.workArea.width - width - 10;
      }
      if (newY + height > display.workArea.y + display.workArea.height) {
        newY = display.workArea.y + display.workArea.height - height - 10;
      }
      if (newX < display.workArea.x) {
        newX = display.workArea.x + 10;
      }
      if (newY < display.workArea.y) {
        newY = display.workArea.y + 10;
      }
      
      mainWindow.setBounds({
        x: Math.round(newX),
        y: Math.round(newY),
        width,
        height
      });
      
      store.bounds = mainWindow.getBounds();
      setStore(store);
    }
  } catch (error) {
    console.error("Error in resize-window IPC:", error.message, "Payload:", payload);
  }
});
