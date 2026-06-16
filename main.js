const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
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
      
      // Attempt silent print only if a physical printer is available
      let hasRealPrinter = false;
      try {
          // In some Electron versions it's getPrinters(), in others getPrintersAsync()
          const printers = win.webContents.getPrinters ? win.webContents.getPrinters() : [];
          hasRealPrinter = printers.some(p => 
              !p.name.toLowerCase().includes('pdf') && 
              !p.name.toLowerCase().includes('xps') && 
              !p.name.toLowerCase().includes('onenote') &&
              !p.name.toLowerCase().includes('fax')
          );
      } catch (e) {
          console.log('Printer detection failed, skipping silent print:', e.message);
      }

      if (hasRealPrinter) {
          win.webContents.print({ 
              silent: true, 
              printBackground: true 
          }, (success, errorType) => {
              if (!success) console.log('Silent print note:', errorType);
          });
      }

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
