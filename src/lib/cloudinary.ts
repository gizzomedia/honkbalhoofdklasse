/**
 * Insert Cloudinary transformation parameters into a Cloudinary upload URL.
 * Returns the URL unchanged if it is not a Cloudinary URL.
 */
function cloudinaryTransform(url: string | null, transform: string): string | null {
  if (!url || !url.includes('res.cloudinary.com')) return url
  return url.replace('/image/upload/', `/image/upload/${transform}/`)
}

/**
 * Face-detected banner: wide crop (16:9) with the face automatically centred.
 * Use as a background/hero image overlay.
 */
export function bannerFaceUrl(url: string | null): string | null {
  return cloudinaryTransform(url, 'c_fill,g_auto:face,ar_16:9')
}

/**
 * Face-detected headshot: square crop (1:1) with the face automatically centred.
 * Use for avatar / player card thumbnails.
 */
export function headshotFaceUrl(url: string | null): string | null {
  return cloudinaryTransform(url, 'c_fill,g_auto:face,ar_1:1')
}
