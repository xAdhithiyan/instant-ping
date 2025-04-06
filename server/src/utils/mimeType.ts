function checkMimeType(filename: string) {
  const parts = filename.split('.');
  switch (parts[parts.length - 1]) {
    case 'jpeg':
    case 'png':
    case 'jpg':
      return {
        type: 'image',
        mime: `image/${parts[parts.length - 1]}`,
      };
      break;

    case 'txt':
    case 'doc':
    case 'xls':
    case 'xlsx':
    case 'docx':
    case 'ppt':
    case 'pptx':
    case 'pdf':
      return {
        type: 'document',
        mime: `document/${parts[parts.length - 1]}`,
      };

      break;

    default:
      return null;
  }
}

console.log(checkMimeType('asdad.pdf'));

export default checkMimeType;
