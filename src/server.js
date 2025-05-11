const express = require("express");
const app = express();
const cors = require("cors");
const path = require("path");
const fs = require("fs");;
const os = require("os");
const sourceDir = path.join(os.homedir(), "Documents", "images");

if (!fs.existsSync(sourceDir)) {
  fs.mkdirSync(sourceDir, { recursive: true });
}

app.use("/pdfImages", express.static(sourceDir));
app.use(
  "/images",
  express.static(path.join(os.homedir(), "Documents", "images"))
);

app.use(express.json());
app.use(cors("*"));


// Database Sync and Admin User Creation (Handled in Electron Main)
const startServer = async () => {
  try {
    // await sequelize.authenticate();
    // console.log("✅ Database connected successfully.");

    // await sequelize.sync({ force: false }); // or { force: true } to drop & recreate tables
    // console.log("📦 Models synchronized with database.");

    // Optional: seed admin user or other initial data here
  } catch (error) {
    console.error("❌ Unable to connect to the database:", error);
  }
};

// Export app and startServer function
module.exports = { app, startServer };
