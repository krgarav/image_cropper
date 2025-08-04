const { app, ipcMain, BrowserWindow, dialog } = require("electron");
const { PDFDocument } = require("pdf-lib");
const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const cors = require("cors");
const bodyParser = require("body-parser");
const { createCanvas } = require("canvas");
const sharp = require("sharp");
const { Worker } = require("worker_threads");
const { app: expressApp, startServer } = require("./server");
async function loadPdfJs() {
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs"); // Dynamically import ES module
  return pdfjsLib;
}
const port = 3400;

// Create main Electron window
function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    devTools: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"), // ✅ Load preload script
      contextIsolation: true, // ✅ Required for contextBridge
      enableRemoteModule: false,
      nodeIntegration: false,
    },
  });
  mainWindow.webContents.once("did-finish-load", () => {
    mainWindow.webContents.openDevTools();
  });
  // mainWindow.setMenu(null);
  // mainWindow.loadURL(`http://localhost:${port}`);
  mainWindow.loadURL(`http://localhost:${5173}`);
  // mainWindow.webContents.openDevTools();
}

// Start Express server when Electro
// n app is ready
app.whenReady().then(async () => {
  await startServer();
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

async function compressAndConvertImagesToPdf(imagePaths, outputPath) {
  const pdfDoc = await PDFDocument.create();

  for (const path of imagePaths) {
    // Resize and compress image using sharp
    const compressedBuffer = await sharp(path)
      .rotate()
      .resize({ width: 1754 }) // Half of 2480 (A4 @ 150 DPI approx)
      .jpeg({
        quality: 80, // Lower quality but still visually fine
        mozjpeg: true, // Enables better compression
        chromaSubsampling: "4:4:4", // Keeps color detail better than default '4:2:0'
      })
      .toBuffer();

    const image = await pdfDoc.embedJpg(compressedBuffer);
    const { width, height } = image.scale(1);
    const page = pdfDoc.addPage([width, height]);

    page.drawImage(image, { x: 0, y: 0, width, height });
  }

  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync(outputPath, pdfBytes);
}

ipcMain.handle("process-pdf", async (event, { pdfPath, destinationDir }) => {
  return new Promise((resolve, reject) => {
    const pdfBaseName = path.parse(pdfPath).name;
    const outputDir = path.join(destinationDir, pdfBaseName);

    if (fs.existsSync(outputDir)) {
      return resolve({
        success: false,
        error: `Folder "${pdfBaseName}" already exists in destination.`,
      });
    }

    const worker = new Worker(path.join(__dirname, "pdfWorker.js"));
    worker.postMessage({ filePath: pdfPath, outputDir });

    let finalResponse = null;

    worker.on("message", (data) => {
      if (data.imageName) {
        event.sender.send("pdf-progress", data); // Optional progress
      }

      if (data.images) {
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

ipcMain.handle(
  "process-all-pdfs",
  async (event, { sourceDir, destinationDir }) => {
    try {
      const files = fs
        .readdirSync(sourceDir)
        .filter((file) => file.toLowerCase().endsWith(".pdf"));

      if (files.length === 0) {
        return {
          success: false,
          error: "No PDF files found in the source directory.",
        };
      }

      const results = [];

      for (const file of files) {
        const filePath = path.join(sourceDir, file);
        const pdfBaseName = path.parse(file).name;
        const outputDir = path.join(destinationDir, pdfBaseName);

        if (fs.existsSync(outputDir)) {
          results.push({
            file,
            success: false,
            error: `Output folder "${pdfBaseName}" already exists.`,
          });
          continue; // Skip to next
        }

        const result = await new Promise((resolve) => {
          const worker = new Worker(path.join(__dirname, "pdfWorker.js"));
          let finalResponse = null;

          worker.postMessage({ filePath, outputDir });

          worker.on("message", (data) => {
            if (data.imageName) {
              // Optional: Emit progress per image to renderer
              event.sender.send("pdf-progress", { file, ...data });
            }

            if (data.images) {
              finalResponse = { file, success: true, images: data.images };
            }
          });

          worker.on("error", (err) => {
            resolve({ file, success: false, error: err.message });
          });

          worker.on("exit", (code) => {
            if (code !== 0) {
              resolve({
                file,
                success: false,
                error: `Worker exited with code ${code}`,
              });
            } else {
              resolve(
                finalResponse || {
                  file,
                  success: false,
                  error: "Unexpected exit before final result.",
                }
              );
            }
          });
        });

        results.push(result);
      }

      return { success: true, results };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
);

ipcMain.handle("get-pdf-files", async (event, dirPath) => {
  try {
    const files = fs.readdirSync(dirPath);
    const pdfs = files
      .filter((file) => file.toLowerCase().endsWith(".pdf"))
      .map((file) => path.join(dirPath, file));
    return pdfs;
  } catch (error) {
    console.error("Error reading directory:", error);
    return [];
  }
});
// ipcMain.handle(
//   "save-cropped-img",
//   async (event, { buffer, folderName, imageName }) => {
//     try {
//       if (!buffer || !folderName) {
//         throw new Error("Missing image buffer or folder name.");
//       }

//       const documentsDir = app.getPath("documents");
//       const baseDir = path.join(documentsDir, "images", folderName); // Require this to exist
//       const croppedDir = path.join(baseDir, "cropped"); // Create this if needed

//       // ✅ Check base folder exists
//       if (!fs.existsSync(baseDir)) {
//         return {
//           success: false,
//           error: `Folder "${folderName}" does not exist in Documents/images.`,
//         };
//       }

//       // ✅ Create "cropped" folder if it doesn't exist
//       if (!fs.existsSync(croppedDir)) {
//         fs.mkdirSync(croppedDir);
//       }

//       const fileName = `cropped-${imageName}`;
//       const filePath = path.join(croppedDir, fileName);

//       fs.writeFileSync(filePath, Buffer.from(buffer));

//       return { success: true, path: filePath };
//     } catch (error) {
//       console.error("Error saving cropped image:", error);
//       return { success: false, error: error.message };
//     }
//   }
// );

ipcMain.handle(
  "save-cropped-img",
  async (event, { buffer, folderName, imageName, destinationDir }) => {
    try {
      if (!buffer || !folderName || !destinationDir) {
        throw new Error(
          "Missing buffer, folder name, or destination directory."
        );
      }

      const baseDir = path.join(destinationDir, folderName);
      const croppedDir = path.join(baseDir, "cropped");

      if (!fs.existsSync(baseDir)) {
        return {
          success: false,
          error: `Folder "${folderName}" does not exist in the destination directory.`,
        };
      }

      if (!fs.existsSync(croppedDir)) {
        fs.mkdirSync(croppedDir, { recursive: true });
      }

      const safeFileName = `cropped-${imageName.replace(/\s+/g, "_")}`;
      const filePath = path.join(croppedDir, safeFileName);

      await fs.promises.writeFile(filePath, Buffer.from(buffer));

      return { success: true, path: filePath };
    } catch (error) {
      console.error("Error saving cropped image:", error);
      return { success: false, error: error.message };
    }
  }
);

ipcMain.handle(
  "check-image-exists",
  async (event, { folderName, imageName }) => {
    try {
      if (!folderName || !imageName) {
        throw new Error("Missing folder name or image name.");
      }
      console.log("cropped:", folderName);
      console.log("imageName", imageName);

      const documentsDir = app.getPath("documents");
      const targetDir = path.join(documentsDir, "images", folderName);
      const imagePath = path.join(targetDir, "cropped", imageName);
      console.log(imagePath);
      console.log(targetDir);
      if (!fs.existsSync(targetDir)) {
        return {
          exists: false,
          error: `Folder "${folderName}" does not exist in Documents/images.`,
        };
      }

      if (fs.existsSync(imagePath)) {
        return {
          exists: true,
          path: imagePath,
        };
      } else {
        return {
          exists: false,
          error: `Image "${imageName}" not found in folder "${folderName}".`,
        };
      }
    } catch (error) {
      console.error("Error checking image:", error);
      return {
        exists: false,
        error: error.message,
      };
    }
  }
);
ipcMain.handle("select-directory", async () => {
  try {
    const result = await dialog.showOpenDialog({
      properties: ["openDirectory"],
    });

    if (result.canceled) {
      return { success: false, error: "No directory selected" };
    }

    const selectedDirectory = result.filePaths[0];
    return { success: true, directory: selectedDirectory };
  } catch (error) {
    console.error("Error selecting directory:", error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle("get-image-names", async (event, directory) => {
  try {
    // Check if the provided directory exists
    if (!fs.existsSync(directory)) {
      return { success: false, error: "Directory does not exist." };
    }

    // Define the path to the 'cropped' subfolder inside the provided directory
    const croppedDir = path.join(directory);

    // Check if the 'cropped' folder exists
    if (!fs.existsSync(croppedDir)) {
      return {
        success: false,
        error: "'cropped' folder does not exist in the directory.",
      };
    }

    // Get all files in the 'cropped' directory
    const files = fs.readdirSync(croppedDir);

    // Filter for image files (you can add more extensions if necessary)
    const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".tiff"];

    const imageFiles = files
      .filter((file) =>
        imageExtensions.includes(path.extname(file).toLowerCase())
      )
      .sort((a, b) =>
        a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" })
      ); // <-- Natural sort (e.g., test-1.png < test-10.png)
    // Get the total count of image files
    const totalImages = imageFiles.length;
    const rootDir = path.basename(directory);
    // Return an array of image file names and the total count
    return { success: true, images: imageFiles, totalImages, rootDir };
  } catch (error) {
    console.error("Error reading directory:", error);
    return { success: false, error: error.message };
  }
});

// 🧩 IPC Handler
ipcMain.handle("convert-dir-images-to-pdf", async (event, folderName) => {
  try {
    if (!folderName) {
      throw new Error("Provided folder name is invalid.");
    }

    const documentsDir = app.getPath("documents");
    const rootDir = path.join(documentsDir, "images", folderName);
    const croppedDir = path.join(rootDir, "cropped");

    if (!fs.existsSync(croppedDir)) {
      throw new Error(`'cropped' folder does not exist in ${folderName}`);
    }

    const allFiles = fs.readdirSync(croppedDir);
    const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".tiff"];

    const imagePaths = allFiles
      .filter((file) =>
        imageExtensions.includes(path.extname(file).toLowerCase())
      )
      .map((file) => path.join(croppedDir, file));

    if (imagePaths.length === 0) {
      throw new Error("No images found in the 'cropped' folder.");
    }

    const baseName = path.basename(rootDir);
    const outputPath = path.join(rootDir, `${baseName}.pdf`);

    await compressAndConvertImagesToPdf(imagePaths, outputPath);

    return {
      success: true,
      message: `PDF saved as ${baseName}.pdf in root folder.`,
      outputPath,
    };
  } catch (error) {
    console.error("Error during PDF conversion:", error);
    return {
      success: false,
      error: error.message,
    };
  }
});

ipcMain.handle("get-image-count", async (event, folderName) => {
  try {
    if (!folderName) {
      throw new Error("Folder name not provided.");
    }

    const documentsDir = app.getPath("documents");
    const croppedDir = path.join(documentsDir, "images", folderName, "cropped");

    if (!fs.existsSync(croppedDir)) {
      return { success: false, error: "'cropped' folder does not exist." };
    }

    const files = fs.readdirSync(croppedDir);
    const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".tiff"];
    const imageFiles = files.filter((file) =>
      imageExtensions.includes(path.extname(file).toLowerCase())
    );

    return {
      success: true,
      count: imageFiles.length,
    };
  } catch (error) {
    console.error("Error getting image count:", error);
    return {
      success: false,
      error: error.message,
    };
  }
});

ipcMain.handle("get-base64-image", async (event, imagePath) => {
  try {
    const buffer = fs.readFileSync(imagePath);
    const ext = path.extname(imagePath).slice(1); // "png", "jpg"
    const base64 = buffer.toString("base64");
    return `data:image/${ext};base64,${base64}`;
  } catch (err) {
    console.error("Failed to read image:", err);
    return null;
  }
});

ipcMain.handle("get-total-images", async (event, { directory, baseFolder }) => {
  try {
    const folderPath = path.join(directory, baseFolder);

    if (!fs.existsSync(folderPath)) {
      return { success: false, error: "Folder does not exist" };
    }

    const files = fs.readdirSync(folderPath);
    const imageFiles = files.filter((file) =>
      /\.(png|jpg|jpeg|gif|bmp|webp)$/i.test(file)
    );

    return {
      success: true,
      totalImages: imageFiles.length,
      imageFiles,
    };
  } catch (err) {
    return {
      success: false,
      error: err.message,
    };
  }
});

ipcMain.handle("get-pdf-names", async (event, sourceDir) => {
  try {
    if (!fs.existsSync(sourceDir)) {
      return {
        success: false,
        error: "Source directory does not exist.",
        pdfs: [],
      };
    }

    const files = fs.readdirSync(sourceDir);
    const pdfs = files
      .filter((file) => file.toLowerCase().endsWith(".pdf"))
      .map((file) => path.parse(file).name); // remove .pdf extension

    return {
      success: true,
      pdfs,
    };
  } catch (err) {
    return {
      success: false,
      error: err.message,
      pdfs: [],
    };
  }
});

ipcMain.handle("check-folder-images", async (event, folderPath) => {
  try {
    if (!fs.existsSync(folderPath)) {
      return {
        success: false,
        error: "Folder does not exist.",
        hasImages: false,
      };
    }

    const files = fs.readdirSync(folderPath);
    const imageExtensions = [".png", ".jpg", ".jpeg", ".gif", ".webp"];

    const hasImages = files.some((file) =>
      imageExtensions.includes(path.extname(file).toLowerCase())
    );

    return {
      success: true,
      hasImages,
    };
  } catch (err) {
    return {
      success: false,
      error: err.message,
      hasImages: false,
    };
  }
});
