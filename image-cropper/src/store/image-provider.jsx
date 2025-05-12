import React, { useState } from "react";
import Imagecontext from "./image-context";

function Imageprovider(props) {
  const initialData = {
    selectedImage: [],
    croppedImage: [],
    pathToSave: "",
  };
  const [imgState, setImgState] = useState(initialData);
  const addToSelectedImageHandler = (imageName) => {
    setImgState((prev) => {
      if (prev.selectedImage.includes(imageName)) return prev;
      return {
        ...prev,
        selectedImage: [...prev.selectedImage, imageName],
      };
    });
  };

  const addAllToSelectedImageHandler = (arrayOfname) => {
    setImgState((prev) => {
      return {
        ...prev,
        selectedImage: arrayOfname,
      };
    });
  };
  const addToCroppedImagesHandler = () => {};
  const removeFromCroppedImageHandler = () => {};
  const addToPathHandler = (path) => {
    setImgState((prev) => {
      return { ...prev, pathToSave: path };
    });
  };
  const resetSelectedImageHandler = () => {
    setImgState((prev) => {
      return { ...prev, selectedImage: [] };
    });
  };
  const imgContext = {
    selectedImage: imgState.selectedImage,
    croppedImage: imgState.croppedImage,
    addToSelectedImage: addToSelectedImageHandler,
    addToCroppedImages: addToCroppedImagesHandler,
    removeFromCroppedImage: removeFromCroppedImageHandler,
    addToPath: addToPathHandler,
    resetSelectedImage: resetSelectedImageHandler,
    addAllImg : addAllToSelectedImageHandler
  };

  return (
    <Imagecontext.Provider value={imgContext}>
      {props.children}
    </Imagecontext.Provider>
  );
}

export default Imageprovider;
