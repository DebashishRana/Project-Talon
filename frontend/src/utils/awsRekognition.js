export async function detectFacesStub(imageBase64) {
  await new Promise(resolve => window.setTimeout(resolve, 350))
  return {
    detected: Boolean(imageBase64),
    confidence: imageBase64 ? 98.4 : 0,
    boundingBox: { left: 0.31, top: 0.18, width: 0.38, height: 0.54 }
  }
}

export async function compareFacesStub(documentImageBase64, faceImageBase64) {
  await new Promise(resolve => window.setTimeout(resolve, 450))
  const seed = `${documentImageBase64 || ''}${faceImageBase64 || ''}`.length
  return {
    match: Boolean(documentImageBase64 && faceImageBase64),
    similarity: Math.min(99.2, 91.5 + (seed % 70) / 10)
  }
}
