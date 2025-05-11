const { app, ipcMain, BrowserWindow } = require("electron");
const { PDFDocument } = require("pdf-lib");
const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const cors = require("cors");
const bodyParser = require("body-parser");
const { createCanvas } = require("canvas");
const { Worker } = require("worker_threads");

async function loadPdfJs() {
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs"); // Dynamically import ES module
  return pdfjsLib;
}
const port = 3400;

// Create Express app
const expressApp = express();


// Create main Electron window
function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"), // ✅ Load preload script
      contextIsolation: true, // ✅ Required for contextBridge
      enableRemoteModule: false,
      nodeIntegration: false,
    },
  });
  mainWindow.setMenu(null);
  mainWindow.loadURL(`http://localhost:${5173}`);
  mainWindow.webContents.openDevTools();
}

// Start Express server when Electron app is ready
app.whenReady().then(() => {
  expressApp.listen(port, () => {
    console.log(`Express server running at http://localhost:${port}`);
  });

  createWindow();
});

// Quit the app when all windows are closed
app.on("window-all-closed", () => {
  // On macOS, quit the app when all windows are closed unless Cmd + Q is explicitly used
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// When the app is activated, create a new browser window
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

ipcMain.handle("process-pdf", async (event, { buffer, name }) => {
  return new Promise((resolve, reject) => {
    const documentsDir = app.getPath("documents");
    const pdfBaseName = path.parse(name).name;
    const outputDir = path.join(documentsDir, "images", pdfBaseName);

    if (fs.existsSync(outputDir)) {
      return resolve({
        success: false,
        error: `Folder with the name "${pdfBaseName}" already exists.`,
      });
    }

    const worker = new Worker(path.join(__dirname, "pdfWorker.js"));
    worker.postMessage({ buffer, name, documentsDir });

    let finalResponse = null;

    worker.on("message", (data) => {
      if (data.imageName) {
        // ⏳ Progress update from worker
        event.sender.send("pdf-progress", data);
      }

      if (data.images) {
        // ✅ Final result
        finalResponse = data;
      }
    });

    worker.on("error", reject);

    worker.on("exit", (code) => {
      if (code !== 0) {
        reject(new Error(`Worker stopped with exit code ${code}`));
      } else {
        resolve(
          finalResponse || {
            success: false,
            error: "Unexpected exit before final result.",
          }
        );
      }
    });
  });
});
