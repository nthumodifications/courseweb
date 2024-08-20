export function getBrightness(color: string) {
  let [r, g, b] = hexToRgb(color);
  return (r * 299 + g * 587 + b * 114) / 1000;
}

const hexToRgb = (hex: string) => {
  const bigint = parseInt(hex.replace("#", ""), 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return [r, g, b];
};

const rgbToHex = (r: number, g: number, b: number) => {
  const componentToHex = (c: number) => {
    const hex = c.toString(16);
    return hex.length == 1 ? "0" + hex : hex;
  };

  return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
};

const rgbToHsl = (r: number, g: number, b: number) => {
  (r /= 255), (g /= 255), (b /= 255);

  const max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  let h = 0,
    s = 0,
    l = (max + min) / 2;

  if (max != min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }

    h /= 6;
  }

  return [h, s, l];
};

//hsl to rgb but returns int values
const hslToRgb = (h: number, s: number, l: number) => {
  let r, g, b;

  if (s == 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;

    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
};

// based on if the color is dark or light, get a complementary color that is legible
export function adjustLuminance(color: string, luminance: number) {
  let [r, g, b] = hexToRgb(color);
  var hsl = rgbToHsl(r, g, b);
  hsl[2] = luminance;
  var rgb = hslToRgb(hsl[0], hsl[1], hsl[2]);
  return rgbToHex(rgb[0], rgb[1], rgb[2]);
}
