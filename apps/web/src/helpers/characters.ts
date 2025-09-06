export const fullWidthToHalfWidth = (str: string) => {
  //check if its a full width 0-9A-Za-z
  const isFullWidth = (char: string) => {
    const code = char.charCodeAt(0);
    if (code >= 65296 && code <= 65305) return true;
    if (code >= 65313 && code <= 65338) return true;
    if (code >= 65345 && code <= 65370) return true;
    return false;
  };
  let result = "";
  for (const char of str) {
    if (isFullWidth(char)) {
      result += String.fromCharCode(char.charCodeAt(0) - 65248);
    } else {
      result += char;
    }
  }
  return result;
};
