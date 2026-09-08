/**
 * Pure TypeScript Code 128 (Type B) Barcode & Label SVG Generator
 * Completely zero-dependency, ultra-fast, and works synchronously on both server and client.
 */

const CODE128_PATTERNS: string[] = [
  "212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312", "132212", "221213", // 0-9
  "221312", "231212", "112232", "122132", "122231", "113222", "123122", "123221", "223211", "221132", // 10-19
  "221231", "213212", "223112", "312131", "311222", "321122", "321221", "312212", "322112", "322211", // 20-29
  "212123", "212321", "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211313", // 30-39
  "231113", "231311", "112133", "112331", "132131", "113123", "113321", "133121", "313121", "211331", // 40-49
  "231131", "213113", "213311", "213131", "311123", "311321", "331121", "312113", "312311", "332111", // 50-59
  "314111", "221411", "431111", "111224", "111422", "121124", "121421", "141122", "141221", "112214", // 60-69
  "112412", "122114", "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111", // 70-79
  "111242", "121142", "121241", "114212", "124112", "124211", "411212", "421112", "421211", "212141", // 80-89
  "214121", "412121", "111143", "111341", "131141", "114113", "114311", "411113", "411311", "113141", // 90-99
  "114131", "311141", "411131", "211412", "211214", "211232", "2331112"  // 100-106
];

const START_B_INDEX = 104;
const STOP_INDEX = 106;

/**
 * Encodes text into Code 128 binary modules (1 = black bar, 0 = white space)
 */
export function encodeCode128Modules(text: string): number[] {
  // Sanitize text to ASCII range 32-126
  const clean = text
    .split("")
    .filter((c) => c.charCodeAt(0) >= 32 && c.charCodeAt(0) <= 126)
    .join("");

  if (clean.length === 0) {
    return encodeCode128Modules("UNKNOWN");
  }

  const values: number[] = [START_B_INDEX];
  let checksumSum = START_B_INDEX;

  for (let i = 0; i < clean.length; i++) {
    const codeVal = clean.charCodeAt(i) - 32;
    values.push(codeVal);
    checksumSum += codeVal * (i + 1);
  }

  const checksumVal = checksumSum % 103;
  values.push(checksumVal);
  values.push(STOP_INDEX);

  const modules: number[] = [];

  values.forEach((patternIdx) => {
    const pattern = CODE128_PATTERNS[patternIdx];
    if (!pattern) return;

    let isBar = true;
    for (let j = 0; j < pattern.length; j++) {
      const width = parseInt(pattern[j], 10);
      for (let k = 0; k < width; k++) {
        modules.push(isBar ? 1 : 0);
      }
      isBar = !isBar;
    }
  });

  return modules;
}

export interface BarcodeLabelOptions {
  barcodeValue: string;
  productName: string;
  price?: number;
  currency?: string;
  storeName?: string;
  width?: number; // default 380
  height?: number; // default 220
  barHeight?: number; // default 65
}

/**
 * Generates an SVG string representation of the barcode sticker label
 */
export function generateBarcodeLabelSVG(options: BarcodeLabelOptions): string {
  const {
    barcodeValue,
    productName,
    price,
    currency = "PKR",
    storeName = "MODERN ECOM",
    width = 380,
    height = 220,
    barHeight = 65,
  } = options;

  const modules = encodeCode128Modules(barcodeValue);
  const totalBarModules = modules.length;
  
  // Calculate module width to fit cleanly with quiet zones
  const horizontalPadding = 24;
  const availableBarcodeWidth = width - horizontalPadding * 2;
  const computedModuleWidth = Math.max(1.2, Number((availableBarcodeWidth / totalBarModules).toFixed(3)));
  const actualBarcodeWidth = totalBarModules * computedModuleWidth;
  const startX = Math.round((width - actualBarcodeWidth) / 2);

  // Build SVG bars
  let barsSvg = "";
  let currentModuleX = startX;
  const barcodeStartY = 85;

  for (let i = 0; i < modules.length; i++) {
    if (modules[i] === 1) {
      // Find contiguous bar width to minimize SVG rects
      let runWidth = 1;
      while (i + 1 < modules.length && modules[i + 1] === 1) {
        runWidth++;
        i++;
      }
      const rectX = currentModuleX.toFixed(2);
      const rectW = (runWidth * computedModuleWidth).toFixed(2);
      barsSvg += `<rect x="${rectX}" y="${barcodeStartY}" width="${rectW}" height="${barHeight}" fill="#000000" />`;
      currentModuleX += runWidth * computedModuleWidth;
    } else {
      currentModuleX += computedModuleWidth;
    }
  }

  // Escape XML characters
  const escapeXml = (unsafe: string) =>
    unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");

  const safeProductName = escapeXml(productName || "Product");
  const safeStoreName = escapeXml(storeName);
  const safeBarcodeValue = escapeXml(barcodeValue);
  const formattedPrice =
    typeof price === "number" && price > 0
      ? `${currency} ${price.toLocaleString()}`
      : "";

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <!-- Background Card -->
  <rect width="100%" height="100%" fill="#ffffff" rx="10" ry="10" stroke="#e2e8f0" stroke-width="2"/>
  
  <!-- Store Header -->
  <text x="${width / 2}" y="24" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="10" font-weight="700" fill="#64748b" letter-spacing="1.5">
    ${safeStoreName.toUpperCase()}
  </text>
  
  <!-- Product Name -->
  <text x="${width / 2}" y="48" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="15" font-weight="800" fill="#0f172a">
    ${safeProductName}
  </text>

  <!-- Price Tag if available -->
  ${
    formattedPrice
      ? `<text x="${width / 2}" y="70" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="13" font-weight="800" fill="#059669">
    ${formattedPrice}
  </text>`
      : ""
  }

  <!-- Barcode Bars -->
  ${barsSvg}

  <!-- Human Readable Barcode Number / Text -->
  <text x="${width / 2}" y="${barcodeStartY + barHeight + 18}" text-anchor="middle" font-family="Courier, 'Courier New', monospace" font-size="12" font-weight="700" fill="#334155" letter-spacing="2">
    ${safeBarcodeValue}
  </text>

  <!-- Dashed Cut Border -->
  <rect x="5" y="5" width="${width - 10}" height="${height - 10}" fill="none" stroke="#cbd5e1" stroke-width="1" stroke-dasharray="4,4" rx="8" ry="8"/>
</svg>`;
}
