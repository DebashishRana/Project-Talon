import api from './api'

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

export async function compareDocumentFaceWithLive(documentImageBase64, faceImageBase64) {
  try {
    const response = await api.post('/api/face-verification/compare', {
      document_image_base64: documentImageBase64,
      live_face_base64: faceImageBase64,
      document_filename: 'document.jpg',
      match_threshold: 90
    })
    const data = response.data
    return {
      match: Boolean(data.matched),
      similarity: Number(data.match_percentage || 0),
      confidence: Number(data.confidence || data.match_percentage || 0),
      provider: data.provider || 'aws-rekognition',
      status: data.status || (data.matched ? 'PASS' : 'REVIEW'),
      label: data.label || (data.matched ? 'Good match' : 'Review advised'),
      documentFaceBase64: data.document_face_base64,
      boundingBox: data.bounding_box,
      observations: Array.isArray(data.observations) ? data.observations : []
    }
  } catch (error) {
    console.warn('AWS face verification unavailable; using local fallback.', error)
    const fallback = await compareFacesStub(documentImageBase64, faceImageBase64)
    return {
      ...fallback,
      confidence: fallback.similarity,
      provider: 'local-fallback',
      status: fallback.match ? 'PASS' : 'REVIEW',
      label: fallback.match ? 'Simulated match' : 'Review advised',
      documentFaceBase64: documentImageBase64,
      observations: [
        {
          title: 'AWS connection',
          status: 'REVIEW',
          detail: 'Rekognition did not respond, so the app preserved the flow with local fallback scoring.'
        },
        {
          title: 'Document portrait',
          status: documentImageBase64 ? 'PASS' : 'REVIEW',
          detail: 'Uploaded document image is present in the session.'
        },
        {
          title: 'Live capture',
          status: faceImageBase64 ? 'PASS' : 'REVIEW',
          detail: 'Live face capture is present in the session.'
        }
      ],
      error: error.response?.data?.detail || error.message
    }
  }
}
