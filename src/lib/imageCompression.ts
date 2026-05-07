import imageCompression from 'browser-image-compression';

export const compressImage = async (imageFile: File): Promise<File> => {
  console.log('originalFile instanceof Blob', imageFile instanceof Blob); // true
  console.log(`originalFile size ${imageFile.size / 1024 / 1024} MB`);

  const options = {
    maxSizeMB: 0.5, // Max size 500KB (optimised for web/mobile)
    maxWidthOrHeight: 1080, // Max width/height 1080px
    useWebWorker: true,
    initialQuality: 0.8, // Good balance of quality and size
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
