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

// Middleware setup
expressApp.use(bodyParser.json({ limit: "1mb" }));
expressApp.use(bodyParser.urlencoded({ extended: true }));
expressApp.use(
  cors({
    origin: "*", // Allow requests from any origin
    methods: ["OPTIONS", "POST", "GET", "DELETE"], // Allow these HTTP methods
    allowedHeaders: ["Content-Type", "Authorization"], // Allow these headers
  })
);

// Get the path to the application executable directory
// Get the path to the Documents directory
const documentsDirectory = path.join(app.getPath("documents"), "uploads");

// Ensure the uploads directory exists
if (!fs.existsSync(documentsDirectory)) {
  fs.mkdirSync(documentsDirectory, { recursive: true });
}

// Serve static files
expressApp.use(express.static(path.join(__dirname, "build")));

// Configure multer for file uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, documentsDirectory);
    },
    filename: function (req, file, cb) {
      cb(null, file.originalname);
    },
  }),
});

// Upload endpoint
expressApp.post("/upload", upload.single("file"), (req, res) => {
  const folderName = req.body.folderName;
  let destinationFolder = documentsDirectory;

  // If the user provided a folder name
  if (folderName) {
    // Resolve the folder path relative to the current working directory
    const folderPath = path.resolve(documentsDirectory, folderName);

    // Check if the folder exists
    if (!fs.existsSync(folderPath)) {
      // If the folder doesn't exist, create it
      fs.mkdirSync(folderPath, { recursive: true });
    }

    destinationFolder = folderPath;
  }

  // Move the uploaded file to the specified destination folder
  const file = req.file;
  const destinationPath = path.join(destinationFolder, file.originalname);

  fs.renameSync(file.path, destinationPath);

  res.send("File uploaded successfully");
});

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

// ipcMain.handle("process-pdf", async (event, { buffer, name }) => {
//   try {
//     const pdfjsLib = await loadPdfJs(); // Load the PDF.js library

//     // Convert Buffer to Uint8Array
//     const pdfBuffer = new Uint8Array(buffer);

//     const loadingTask = pdfjsLib.getDocument({ data: pdfBuffer });
//     const pdf = await loadingTask.promise;

//     const pdfBaseName = path.parse(name).name;
//     const documentsDir = app.getPath("documents");
//     const outputDir = path.join(documentsDir, "images", pdfBaseName);
//     fs.mkdirSync(outputDir, { recursive: true });

//     const imageNames = [];

//     for (let i = 0; i < pdf.numPages; i++) {
//       const page = await pdf.getPage(i + 1);
//       const viewport = page.getViewport({ scale: 2 });

//       const canvas = createCanvas(viewport.width, viewport.height);
//       const context = canvas.getContext("2d");

//       const renderContext = {
//         canvasContext: context,
//         viewport: viewport,
//       };

//       await page.render(renderContext).promise;

//       const imageBuffer = canvas.toBuffer("image/png");
//       const imageName = `${pdfBaseName}-${i + 1}.png`;
//       const imagePath = path.join(outputDir, imageName);

//       fs.writeFileSync(imagePath, imageBuffer);

//       imageNames.push(imageName);
//     }

//     return {
//       folderName: pdfBaseName,
//       images: imageNames,
//     };
//   } catch (err) {
//     console.error("Failed to process PDF:", err);
//     return { folderName: null, images: [] };
//   }
// });

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
