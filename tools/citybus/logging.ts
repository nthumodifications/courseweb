export const sanitizeLogValue = (value: unknown) =>
  String(value).replace(/[\u0000-\u001f\u007f-\u009f]/g, "");
