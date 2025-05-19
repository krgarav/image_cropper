import React, { useContext, useState, useEffect, useRef } from "react";
import DrawerAppBar from "../component/Appbar/Appbar";
import classes from "./Homepage.module.css";
import imageContext from "../store/image-context";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import ArrowBackIosIcon from "@mui/icons-material/ArrowBackIos";
import { Grid, Button, IconButton, TextField } from "@mui/material";
import Cropper from "react-cropper";
import { toast } from "react-toastify";
import LoadingButton from "@mui/lab/LoadingButton";
import SaveIcon from "@mui/icons-material/Save";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import Rotate90DegreesCcwIcon from "@mui/icons-material/Rotate90DegreesCcw";
import { MdOutlineRotate90DegreesCw } from "react-icons/md";
// import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "cropperjs/dist/cropper.css";
import { useCallback } from "react";
const Homepage = () => {
  const [image, setImage] = useState(null);
  const [currIndex, setCurrIndex] = useState(0);
  const [totalImages, setTotalImages] = useState(null);
  const imgCtx = useContext(imageContext);
  const [dirName, setDirName] = useState(null);
  const cropperRef = useRef(null);
  const imgSelected = imgCtx.selectedImage;
  const [imgWidth, setImgWidth] = useState("");
  const [imgHeight, setImgHeight] = useState("");
  const [imageName, setImageName] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const [rotate, setRotate] = useState(0);
  const [loading, setLoading] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [isCropped, setIsCropped] = useState(false);
  const [selectedDir, setSelectedDir] = useState("");
  const [dirError, setDirError] = useState(null);
  const [isConverting, setIsConverting] = useState(false); // to disable button
  const toastIdRef = useRef(null);
  const hasInsertedImage = useRef(false);
  const theme = createTheme({
    palette: {
      ochre: {
        main: "#E3D026",
        light: "#E9DB5D",
        dark: "#A29415",
        contrastText: "#242105",
      },
    },
  });

  useEffect(() => {
    const name = localStorage.getItem("currentDir");
    const getImageCount = async (folderName) => {
      const result = await window.electron.ipcRenderer.invoke(
        "get-image-count",
        folderName
      );

      if (result.success) {
        setCurrIndex(result.count - 1);
        setIsCropped(true);
        console.log("Image count:", result.count);
      } else {
        console.error("Error:", result.error);
      }
    };

    if (name) {
      getImageCount(name);
    }
  }, []);
  useEffect(() => {
    const name = localStorage.getItem("currentDir");
    if (name) {
      setFolderName(name);
      setDirName(name);
    }
  }, [totalImages, imgCtx]);
  const prevHandler = async () => {
    setCurrIndex((value) => {
      if (value === 0) {
        alert("No previous image present");
        return value;
      } else {
        const newIndex = value - 1;
        const imageName = imgCtx.selectedImage[newIndex];
        checkCroppedStatus(imageName, folderName);
        return newIndex;
      }
    });
  };

  const nextHandler = async () => {
    setCurrIndex((value) => {
      if (value === imgCtx.selectedImage.length - 1) {
        alert("You have reached the last image");
        return value;
      } else {
        const newIndex = value + 1;
        console.log(newIndex);
        const imageName = imgCtx.selectedImage[newIndex];
        checkCroppedStatus(imageName, folderName);
        return newIndex;
      }
    });
  };
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "ArrowRight") {
        nextHandler();
      } else if (event.key === "ArrowLeft") {
        prevHandler();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [nextHandler]);
  useEffect(() => {
    // Update that same toast as each image comes through
    const handleProgress = (event, data) => {
      const { imageIndex, totalImages, imageName } = data;

      if (!toastIdRef.current) return; // no toast to update
      // ✅ Only add the first image
      if (!hasInsertedImage.current) {
        setTotalImages(totalImages);
        hasInsertedImage.current = true;
      }
      console.log(imageName);
      imgCtx.addToSelectedImage(imageName);
      // If it’s the very last image, mark success
      if (imageIndex === totalImages) {
        toast.update(toastIdRef.current, {
          render: `🎉 All ${totalImages} images processed!`,
          type: "success",
          isLoading: false,
          autoClose: 3000,
        });
        toastIdRef.current = null;
      } else {
        // Otherwise, show live progress

        toast.update(toastIdRef.current, {
          render: `✅ ${imageIndex} / ${totalImages}: ${imageName}`,
        });
      }
    };

    window.electron.ipcRenderer.on("pdf-progress", handleProgress);
    return () => {
      window.electron.ipcRenderer.removeListener(
        "pdf-progress",
        handleProgress
      );
    };
  }, []);

  useEffect(() => {
    const imgUrl = imgCtx.selectedImage.map((item) => {
      return item.imageUrl;
    });
    const imageName = imgCtx.selectedImage.map((item) => {
      return item.imageName;
    });
    setImageName(imageName[currIndex]);
    // setImage(imgUrl[currIndex]);
  }, [imgCtx.selectedImage, currIndex]);

  useEffect(() => {
    if (cropperRef.current !== null) {
      const cropper = cropperRef.current.cropper;
      const imageData = cropper.getImageData();
      const imageWidth = imageData.width;
      const imageHeight = imageData.height;
      setImgHeight(imageHeight);
      setImgWidth(imageWidth);
    }
  }, [cropperRef, rotate]);

  // const saveHandler = useCallback(async () => {
  //   setLoading(true);

  //   if (!folderName) {
  //     toast.error("Please enter folder name!");
  //     setLoading(false);
  //     return;
  //   }

  //   if (
  //     !imgSelected ||
  //     !Array.isArray(imgSelected) ||
  //     imgSelected.length === 0 ||
  //     currIndex < 0 ||
  //     !imgSelected[currIndex]
  //   ) {
  //     toast.error("No image selected!");
  //     setLoading(false);
  //     return;
  //   }

  //   const imageName = imgSelected[currIndex];
  //   const cropper = cropperRef.current?.cropper;

  //   if (!cropper) {
  //     toast.error("Cropper not initialized");
  //     setLoading(false);
  //     return;
  //   }

  //   const croppedCanvas = cropper.getCroppedCanvas();
  //   if (!croppedCanvas) {
  //     toast.error("No cropped area found");
  //     setLoading(false);
  //     return;
  //   }

  //   const filename = imageName || `cropped-${Date.now()}.png`;

  //   try {
  //     const blob = await new Promise((resolve, reject) => {
  //       croppedCanvas.toBlob((b) => {
  //         if (b) resolve(b);
  //         else reject(new Error("Failed to create blob from canvas"));
  //       }, "image/png");
  //     });

  //     const arrayBuffer = await blob.arrayBuffer();

  //     if (!window.electron?.ipcRenderer?.invoke) {
  //       toast.error("IPC not available");
  //       setLoading(false);
  //       return;
  //     }

  //     const result = await window.electron.ipcRenderer.invoke(
  //       "save-cropped-img",
  //       {
  //         buffer: Array.from(new Uint8Array(arrayBuffer)),
  //         filename,
  //         folderName,
  //         imageName,
  //       }
  //     );

  //     if (result.success) {
  //       toast.success(`${filename} saved in ${folderName}`);
  //       nextHandler?.();
  //     } else {
  //       throw new Error(result.error || "Unknown IPC error");
  //     }
  //   } catch (err) {
  //     toast.error("Image could not be saved");
  //     console.error("Save Error:", err);
  //   } finally {
  //     setLoading(false);
  //   }
  // }, [folderName, imgSelected, currIndex, cropperRef, nextHandler]);

  const saveHandler = useCallback(async () => {
    setLoading(true);

    try {
      if (!folderName?.trim()) {
        toast.error("Please enter folder name!");
        return;
      }

      if (
        !Array.isArray(imgSelected) ||
        imgSelected.length === 0 ||
        currIndex < 0 ||
        !imgSelected[currIndex]
      ) {
        toast.error("No image selected!");
        return;
      }

      const imageName = imgSelected[currIndex];
      const cropper = cropperRef.current?.cropper;

      if (!cropper) {
        toast.error("Cropper not initialized");
        return;
      }

      const croppedCanvas = cropper.getCroppedCanvas();
      if (!croppedCanvas) {
        toast.error("No cropped area found");
        return;
      }

      const blob = await new Promise((resolve, reject) => {
        croppedCanvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("Failed to create blob"))),
          "image/jpeg",
          0.95
        );
      });

      const arrayBuffer = await blob.arrayBuffer();
      const uint8Array = Array.from(new Uint8Array(arrayBuffer));

      if (!window.electron?.ipcRenderer?.invoke) {
        toast.error("IPC not available");
        return;
      }

      const result = await window.electron.ipcRenderer.invoke(
        "save-cropped-img",
        {
          buffer: uint8Array,
          filename: `cropped-${imageName.replace(/\s+/g, "_")}`,
          folderName,
          imageName,
        }
      );

      if (result.success) {
        toast.success(`${imageName} saved in "${folderName}"`);
        // cropper.destroy();
        // cropperRef.current = null;
        nextHandler?.();
      } else {
        throw new Error(result.error || "Unknown IPC error");
      }
    } catch (err) {
      console.error("Save Error:", err);
      toast.error("Image could not be saved");
    } finally {
      setLoading(false);
    }
  }, [folderName, imgSelected, currIndex, cropperRef, nextHandler]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      // e.altKey checks if Alt is pressed, e.key === 's' checks for 's' key
      if (e.key === "Enter") {
        e.preventDefault(); // Prevent any default behavior
        saveHandler();
        console.log("Alt + S pressed");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [saveHandler]);
  const handleFileChange = async (event) => {
    const files = event.target.files;

    if (!files || files.length === 0) return;

    const file = files[0];
    const reader = new FileReader();

    reader.onload = async (e) => {
      const arrayBuffer = e.target.result;

      // Start one persistent "loading" toast
      toastIdRef.current = toast.loading("🔄 Extraction in progress…", {
        autoClose: false,
        closeOnClick: false,
        draggable: false,
      });

      try {
        // Invoke your main‐process PDF extractor
        const response = await window.electron.ipcRenderer.invoke(
          "process-pdf",
          { buffer: arrayBuffer, name: file.name }
        );

        // If the main process signals a hard failure:
        if (response.success === false) {
          toast.update(toastIdRef.current, {
            render: `❌ ${response.error}`,
            type: "error",
            isLoading: false,
            autoClose: 5000,
          });
          toastIdRef.current = null;

          return;
        }

        // Otherwise, once *all* images are done, transform the toast
        // (we’ll also handle this again in the progress listener
        // for the final update, but it’s safe to do it here too)
        toast.update(toastIdRef.current, {
          render: "✅ Extraction completed successfully!",
          type: "success",
          isLoading: false,
          autoClose: 3000,
        });
        console.log("Images received:", response.images);
        toastIdRef.current = null;
      } catch (err) {
        toast.update(toastIdRef.current, {
          render: "❌ Unexpected error during extraction.",
          type: "error",
          isLoading: false,
          autoClose: 5000,
        });
        console.error(err);
        toastIdRef.current = null;
      }
    };

    reader.readAsArrayBuffer(file);
    // ✅ Save the file name in localStorage
    const fileNameWithoutExtension = file.name.replace(/\.[^/.]+$/, "");
    localStorage.setItem("currentDir", fileNameWithoutExtension);
    setDirName(fileNameWithoutExtension);
    console.log("Saved filename:", localStorage.getItem("currentDir"));
  };
  const checkCroppedStatus = async (imageName, folderName) => {
    const result = await window.electron.ipcRenderer.invoke(
      "check-image-exists",
      {
        folderName: `${folderName}`,
        imageName: `cropped-${imageName}`,
      }
    );

    setIsCropped(result.exists);
  };

  console.log(imgSelected);

  // const clearHandler = () => {
  //   imgCtx.resetSelectedImage();
  //   setCurrIndex(0);
  //   setFolderName("");
  //   // setImage("");
  //   setRotate(0);
  // };

  const clearHandler = async () => {
    if (!folderName) {
      toast.error("No folder name provided.");
      return;
    }

    setIsConverting(true);
    const loadingToast = toast.loading("Creating PDF...");

    try {
      const result = await window.electron.ipcRenderer.invoke(
        "convert-dir-images-to-pdf",
        folderName
      );

      if (result.success) {
        toast.update(loadingToast, {
          render: `PDF created at: ${result.outputPath}`,
          type: "success",
          isLoading: false,
          autoClose: 5000,
        });
      } else {
        toast.update(loadingToast, {
          render: `❌ ${result.error}`,
          type: "error",
          isLoading: false,
          autoClose: 5000,
        });
      }
    } catch (error) {
      toast.update(loadingToast, {
        render: `❌ Unexpected error: ${error.message}`,
        type: "error",
        isLoading: false,
        autoClose: 5000,
      });
    } finally {
      setIsConverting(false);
    }
  };
  const handleDrop = (event) => {
    event.preventDefault();
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    setIsDragOver(true);
  };
  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleRightRotate = () => {
    const cropper = cropperRef.current.cropper;
    cropper.rotate(1);
    setRotate(rotate + 1);
  };
  const handleLeftRotate = () => {
    const cropper = cropperRef.current.cropper;
    cropper.rotate(-1);
    setRotate(rotate - 1);
  };
  const handleNinetyLeft = () => {
    const cropper = cropperRef.current.cropper;
    cropper.rotate(-90);
    setRotate(rotate - 90);
  };
  const handleNinetyRight = () => {
    const cropper = cropperRef.current.cropper;
    cropper.rotate(+90);
    setRotate(rotate + 90);
  };
  const handleFolderChange = (event) => {
    setFolderName(event.target.value);
  };

  const handleDirectorySelect = async () => {
    try {
      // Select the directory
      const result = await window.electron.ipcRenderer.invoke(
        "select-directory"
      );

      if (result.success) {
        setSelectedDir(result.directory); // Set the selected directory
        // Now, get the image names from the selected directory
        await fetchImageNames(result.directory);
      } else {
        setDirError(result.error); // Set error if the directory is not selected properly
        imgCtx.addAllImg([]); // Clear any previous image names
      }
    } catch (error) {
      setDirError("An error occurred while selecting the directory.");
      imgCtx.addAllImg([]); // Clear any previous image names
      console.error(error);
    }
  };

  const fetchImageNames = async (directory) => {
    try {
      // Fetch image names from the selected directory
      const result = await window.electron.ipcRenderer.invoke(
        "get-image-names",
        directory
      );

      if (result.success) {
        if (result.images.length > 0) {
          imgCtx.addAllImg(result.images); // Set the images if found
          console.log(result.images);
          localStorage.setItem("currentDir", result.rootDir);
        } else {
          imgCtx.addAllImg([]);
        }
      } else {
        imgCtx.addAllImg([]); // Clear previous images
      }
    } catch (error) {
      imgCtx.addAllImg([]); // Clear previous images
      console.error(error);
    }
  };
  return (
    <>
      <DrawerAppBar
        activeRoute="Image Cropper"
        fileName={
          <article>
            <span style={{ color: "ivory" }}>
              {currIndex + 1} of {imgCtx.selectedImage.length}
            </span>
            <span style={{ color: "whiteSmoke" }}>:</span>
            {imgCtx.selectedImage[currIndex]}
          </article>
        }
      />
      <main className={classes.main_container}>
        <div className={classes.box}>
          {imgSelected.length === 0 && (
            <div className={classes.mainbox}>
              <div
                className={`${classes.dropbox} `}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              >
                <div className={`${isDragOver ? classes.dragOver : ""}`}>
                  <label htmlFor="file-upload">
                    <h1 className={classes.uploader}>
                      Click here to choose PDF
                    </h1>
                  </label>
                  <input
                    id="file-upload"
                    type="file"
                    multiple
                    accept="application/pdf"
                    onChange={handleFileChange}
                    style={{ display: "none" }}
                  />
                </div>
              </div>

              <div className={classes.continueBox}>
                <h2 className={classes.continueText}>
                  📂 Continue Working on Existing Images
                </h2>
                <div className={classes.directorySelector}>
                  {selectedDir ? (
                    <div>
                      <p>Selected Directory: {selectedDir}</p>
                    </div>
                  ) : (
                    <button
                      className={classes.selectButton}
                      onClick={handleDirectorySelect}
                    >
                      Select Directory
                    </button>
                  )}
                  {dirError && (
                    <p className={classes.errorMessage}>{dirError}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {imgSelected.length !== 0 && (
            <section>
              <div
                className={classes.cropper}
                style={{
                  padding: "5px",
                  marginBottom: "10px",
                  marginTop: "10px",
                  border: "1px solid black",
                  borderRadius: "5px",
                }}
              >
                <div
                  style={{ display: "flex", alignItems: "center", gap: "8px" }}
                >
                  Cropped Status:
                  {isCropped ? (
                    <span style={{ color: "green" }}>✅</span>
                  ) : (
                    <span style={{ color: "red" }}>❌</span>
                  )}
                </div>

                <Cropper
                  src={`http://localhost:3400/images/${dirName}/${imgSelected[currIndex]}`}
                  style={{
                    height: "70vh", // Updated to 'vh' for viewport height
                    width: "70vw", // Updated to 'vw' for viewport width
                  }}
                  guides={true}
                  ref={cropperRef}
                  initialAspectRatio={0}
                  viewMode={1}
                  minCropBoxHeight={10}
                  minCropBoxWidth={10}
                  background={true}
                  responsive={true}
                  autoCropArea={0}
                  checkOrientation={false}
                  zoomable={false}
                  rotatable={true}
                  autoCrop={false}
                />
              </div>

              <div className={classes.rotate_section}>
                <ThemeProvider theme={theme}>
                  <Button
                    variant="contained"
                    color="ochre"
                    onClick={handleRightRotate}
                  >
                    Rotate 1&deg; left
                  </Button>
                  <IconButton
                    color="secondary"
                    aria-label="rotate left"
                    onClick={handleNinetyLeft}
                  >
                    <Rotate90DegreesCcwIcon />
                  </IconButton>

                  <IconButton
                    color="secondary"
                    aria-label="rotate right"
                    onClick={handleNinetyRight}
                  >
                    <MdOutlineRotate90DegreesCw />
                  </IconButton>
                  <Button
                    variant="contained"
                    color="ochre"
                    onClick={handleLeftRotate}
                  >
                    Rotate 1&deg; Right
                  </Button>
                </ThemeProvider>
              </div>

              {/* Use Material-UI Grid System for Layout */}
              <Grid container spacing={2}>
                <Grid item xs={12} sm={3}>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={clearHandler}
                    fullWidth
                    disabled={isConverting}
                  >
                    {isConverting ? "Creating PDF..." : "CREATE PDF"}
                  </Button>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Grid container spacing={2} justifyContent="center">
                    <Grid item>
                      <Button
                        variant="contained"
                        color="secondary"
                        startIcon={<ArrowBackIosIcon />}
                        onClick={prevHandler}
                      >
                        PREV
                      </Button>
                    </Grid>
                    <Grid item>
                      {loading ? (
                        <LoadingButton
                          loading
                          loadingPosition="start"
                          startIcon={<SaveIcon />}
                          variant="outlined"
                        >
                          SAVING
                        </LoadingButton>
                      ) : (
                        <Button
                          variant="outlined"
                          color="success"
                          startIcon={<SaveIcon />}
                          onClick={saveHandler}
                        >
                          SAVE
                        </Button>
                      )}
                    </Grid>
                    <Grid item>
                      <Button
                        variant="contained"
                        color="secondary"
                        endIcon={<ArrowForwardIosIcon />}
                        onClick={nextHandler}
                      >
                        NEXT
                      </Button>
                    </Grid>
                  </Grid>
                </Grid>

                <Grid item xs={12} sm={3}>
                  <TextField
                    id="outlined-textarea"
                    label="Destination Folder Name"
                    placeholder="Enter folder Name"
                    multiline
                    color="secondary"
                    value={folderName}
                    focused
                    onChange={handleFolderChange}
                    fullWidth
                    disabled
                  />
                </Grid>
              </Grid>
            </section>
          )}
        </div>
      </main>
    </>
  );
};

export default Homepage;
