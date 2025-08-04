import React from "react";
import { useState } from "react";
import classes from "./Homepage.module.css";
const Mainpage = () => {
  const [sourceDir, setSourceDir] = useState("");
  const [destinationDir, setDestinationDir] = useState("");

  const handleDirectorySelect2 = async (type) => {
    const result = await window.electron.ipcRenderer.invoke(
      "select-directory",
      type
    );
    console.log(result);

    if (result.success) {
      if (type === "source") {
        console.log("Source Directory:", result.directory);
        setSourceDir(result.directory);
      } else if (type === "destination") {
        setDestinationDir(result.directory);
      }
    } else {
      console.error("Error selecting directory:", result.error);
    }
  };

  const handleSubmit = () => {
    if (!sourceDir || !destinationDir) {
      alert("Please select both source and destination directories.");
      return;
    }

    console.log("Submitting with:", {
      sourceDir,
      destinationDir,
    });

    // Your logic here: send to backend, move files, etc.
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "2rem",
          maxWidth: "600px",
          margin: "2rem auto",
        }}
      >
        {/* Source Directory */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem",
          }}
        >
          <label htmlFor="source-dir" style={{ fontWeight: "bold" }}>
            Source Directory
          </label>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <input
              id="source-dir"
              type="text"
              value={sourceDir}
              readOnly
              placeholder="No directory selected"
              style={{
                flex: 1,
                padding: "8px",
                border: "1px solid #ccc",
                borderRadius: "4px",
                fontSize: "14px",
              }}
            />
            <button
              onClick={() => handleDirectorySelect2("source")}
              style={{
                padding: "8px 12px",
                fontSize: "14px",
                cursor: "pointer",
                borderRadius: "4px",
                border: "1px solid #ccc",
                backgroundColor: "#f5f5f5",
              }}
            >
              Browse...
            </button>
          </div>
        </div>

        {/* Destination Directory */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem",
          }}
        >
          <label htmlFor="destination-dir" style={{ fontWeight: "bold" }}>
            Destination Directory
          </label>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <input
              id="destination-dir"
              type="text"
              value={destinationDir}
              readOnly
              placeholder="No directory selected"
              style={{
                flex: 1,
                padding: "8px",
                border: "1px solid #ccc",
                borderRadius: "4px",
                fontSize: "14px",
              }}
            />
            <button
              onClick={() => handleDirectorySelect2("destination")}
              style={{
                padding: "8px 12px",
                fontSize: "14px",
                cursor: "pointer",
                borderRadius: "4px",
                border: "1px solid #ccc",
                backgroundColor: "#f5f5f5",
              }}
            >
              Browse...
            </button>
          </div>
        </div>

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          style={{
            alignSelf: "flex-end",
            marginTop: "1rem",
            padding: "10px 20px",
            fontSize: "14px",
            borderRadius: "4px",
            border: "1px solid #007bff",
            backgroundColor: "#007bff",
            color: "#fff",
            cursor: "pointer",
          }}
        >
          Submit
        </button>
      </div>
    </div>
  );
};

export default Mainpage;
