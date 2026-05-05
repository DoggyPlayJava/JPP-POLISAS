import imageCompression from 'browser-image-compression';

export const compressImage = async (imageFile: File): Promise<File> => {
  console.log('originalFile instanceof Blob', imageFile instanceof Blob); // true
  console.log(`originalFile size ${imageFile.size / 1024 / 1024} MB`);

  const options = {
    maxSizeMB: 1, // Max size 1MB
    maxWidthOrHeight: 1920, // Max width/height 1920px
    useWebWorker: true,
  };

  try {
    const compressedFile = await imageCompression(imageFile, options);
    console.log('compressedFile instanceof Blob', compressedFile instanceof Blob); // true
    console.log(`compressedFile size ${compressedFile.size / 1024 / 1024} MB`);
    return compressedFile;
  } catch (error) {
    console.error('Error compressing image:', error);
    // If compression fails, return the original file to avoid breaking the flow
    return imageFile;
  }
};
