declare module 'html-docx-js' {
  const htmlDocx: {
    asBlob: (html: string, options?: any) => Blob;
  };
  export default htmlDocx;
}
