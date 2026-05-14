/**
 * Insert Cloudinary transformation parameters into a Cloudinary upload URL.
 * Returns the URL unchanged if it is not a Cloudinary URL.
 */
function cloudinaryTransform(url: string | null, transform: string): string | null {
  if (!url || !url.includes('res.cloudinary.com')) return url
  return url.replace('/image/upload/', `/image/upload/${transform}/`)
}

/**
 * Face-detected banner: wide crop (3:1) centred on the detected face.
 * g_face is available on all Cloudinary plans; ar_3:1 matches the modal/hero ratio
 * so object-cover won't crop the face a second time.
 */
export function bannerFaceUrl(url: string | null): string | null {
  return cloudinaryTransform(url, 'c_fill,g_face,ar_3:1')
}

/**
 * Face-detected headshot: square crop (1:1) centred on the detected face.
 * c_thumb with g_face zooms in tightly so the face fills the avatar.
 */
export function headshotFaceUrl(url: string | null): string | null {
  return cloudinaryTransform(url, 'c_thumb,g_face,ar_1:1,z_0.75')
}
