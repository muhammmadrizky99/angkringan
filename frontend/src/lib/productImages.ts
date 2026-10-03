/**
 * Product Image Mapping Utility
 * Maps product names to static image paths without requiring database changes.
 */

const PRODUCT_IMAGES: Record<string, string> = {
  'nasi kucing ayam suwir': '/images/products/nasi-kucing-ayam-suwir.png',
  'nasi kucing cumi asin': '/images/products/nasi-kucing-cumi-asin.png',
  'rais boll cumi asin': '/images/products/rais-boll-cumi-asin.png',
  'rais boll ayam suwir': '/images/products/rais-boll-ayam-suwir.png',
  'bakso': '/images/products/bakso.png',
  'usus': '/images/products/usus.png',
  'sosis kecil': '/images/products/sosis-kecil.png',
  'sosis besar': '/images/products/sosis-besar.png',
  'tempe bacem': '/images/products/tempe-bacem.png',
  'tahu bacem': '/images/products/tahu-bacem.png',
  'tahu': '/images/products/tahu.png',
  'leher': '/images/products/leher.png',
  'cikua': '/images/products/cikua.png',
  'ampela': '/images/products/ampela.png',
  'telur puyuh': '/images/products/telur-puyuh.png',
  'ceker': '/images/products/ceker.png',
  'buntut': '/images/products/buntut.png',
};

const CATEGORY_FALLBACK: Record<string, string> = {
  'Nasi': '/images/products/nasi-kucing-ayam-suwir.png',
  'Sate': '/images/products/usus.png',
  'Lauk': '/images/products/ampela.png',
  'Gorengan': '/images/products/tahu.png',
  'Minuman': '/images/products/bakso.png',
};

const DEFAULT_IMAGE = '/images/products/bakso.png';

/**
 * Get product image path based on product name.
 * Falls back to category default, then generic default.
 */
export function getProductImage(name: string, category?: string): string {
  const key = name.toLowerCase().trim();

  if (PRODUCT_IMAGES[key]) {
    return PRODUCT_IMAGES[key];
  }

  // Partial match
  for (const [productName, imagePath] of Object.entries(PRODUCT_IMAGES)) {
    if (key.includes(productName) || productName.includes(key)) {
      return imagePath;
    }
  }

  // Category fallback
  if (category && CATEGORY_FALLBACK[category]) {
    return CATEGORY_FALLBACK[category];
  }

  return DEFAULT_IMAGE;
}
