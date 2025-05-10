import React, { useContext, useEffect, useRef, useState } from "react";
import Cropper from "react-cropper";
import "cropperjs/dist/cropper.css";
import imageContext from "../../store/image-context";
const ImageSelector = (props) => {
  const cropperRef = useRef(null);
  const [croppedImageUrl, setCroppedImageUrl] = useState(null);

  useEffect(()=>{
    props.onSendItem(sendItem);
  },[props.onSendItem]);
  const handleCrop = () => {
    // if (typeof cropperRef.current.getCroppedCanvas() === "undefined") {
    //   return;
    // }
    // setCroppedImageUrl(cropperRef.current.getCroppedCanvas().toDataURL());
    // console.log(cropperRef.current.getCroppedCanvas())
    // if (cropperRef.current) {
    //   const croppedCanvas = cropperRef.current.getCroppedCanvas();
    //   if (croppedCanvas !== null) {
    //     setCroppedImageUrl(croppedCanvas.toDataURL());
    //   }
    // }
    // const cropper = cropperRef.current?.cropper;
    // setCroppedImageUrl(cropper.getCroppedCanvas().toDataURL());
    // props.croppedImage(cropper.getCroppedCanvas().toDataURL())
    // console.log(cropper.getCroppedCanvas().toDataURL());
  };
 
  // console.log(croppedImageUrl);
  const sendItem = () => {
    console.log("child called")
    // const cropper = cropperRef.current?.cropper;
    // setCroppedImageUrl(cropper.getCroppedCanvas().toDataURL());
    // console.log(cropper.getCroppedCanvas().toDataURL());
  };
  return (
    <div style={{ width: "100%" }}>
      <Cropper
        src={props.imgurl}
        style={{ maxHeight: "70dvh", width: "100%" }}
        guides={true}
        crop={handleCrop}
        ref={cropperRef}
      />
    </div>
  );
};

export default ImageSelector;
