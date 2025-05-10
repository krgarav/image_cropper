function getImageDimensions(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
      };
      img.onerror = (error) => {
        reject(error);
      };
      img.src = url;
    });
  }

  export default getImageDimensions;