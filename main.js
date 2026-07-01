const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

// Disable hardware acceleration to prevent UI lag/freezes
app.disableHardwareAcceleration();
app.commandLine.appendSwitch('disable-gpu-compositing');
app.commandLine.appendSwitch('disable-software-rasterizer');

// When launched by migrate.js as a runner — do nothing here, migrate.js handles everything
if (process.argv.includes('--run-migrate')) {
  // migrate.js will require itself and use app.whenReady — just don't create windows
} else {

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      backgroundThrottling: false
    }
  });

  win.loadFile(path.join(__dirname, 'pages/customers.html'));
}

app.whenReady().then(() => {
  createWindow();

  ipcMain.handle('print-to-pdf', async (event, { folder, name }) => {
    const win = BrowserWindow.getFocusedWindow();
    if (!win) return { success: false, error: 'No focused window' };

    try {
      // Get desktop path
      const desktopPath = app.getPath('desktop');
      const baseDir = path.join(desktopPath, folder);
      if (!fs.existsSync(baseDir)) fs.mkdirSync(baseDir);

      const filePath = path.join(baseDir, name);
      
      const data = await win.webContents.printToPDF({
        printBackground: true,
        margins: { marginType: 'default' }
      });
      
      fs.writeFileSync(filePath, data);
      
      // Always trigger print dialog after saving PDF
      win.webContents.print({ silent: false, printBackground: true }, (success, errorType) => {
        if (!success) console.log('Print note:', errorType);
      });

      return { success: true, path: filePath };
    } catch (error) {
      console.error('PDF Export Error:', error);
      return { success: false, error: error.message };
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

} // end else (not --run-migrate)
