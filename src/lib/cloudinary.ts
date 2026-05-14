function cloudinaryTransform(url: string | null, transform: string): string | null {
  if (!url || !url.includes('res.cloudinary.com')) return url
  return url.replace('/image/upload/', `/image/upload/${transform}/`)
}

/**
 * Face-detected headshot: square crop (1:1) centred on the detected face.
 */
export function headshotFaceUrl(url: string | null): string | null {
  return cloudinaryTransform(url, 'c_thumb,g_face,ar_1:1,z_0.75')
}
