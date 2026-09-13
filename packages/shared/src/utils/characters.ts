const FULLWIDTH_OFFSET = 0xfee0;

export const fullWidthToHalfWidth = (str: string) =>
  str.replace(/[０-９Ａ-Ｚａ-ｚ]/g, (char) =>
    String.fromCharCode(char.charCodeAt(0) - FULLWIDTH_OFFSET),
  );
