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

export async function compareDocumentFaceWithLive(documentImageBase64, faceImageBase64, options = {}) {
  try {
    const response = await api.post('/api/face-verification/compare', {
      document_image_base64: documentImageBase64,
      live_face_base64: faceImageBase64,
      document_filename: options.documentFilename || 'document.jpg',
      document_type: options.documentType,
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
      observations: Array.isArray(data.observations) ? data.observations : [],
      sentinel: data.sentinel
    }
  } catch (error) {
    console.warn('AWS face verification unavailable.', error)
    const serviceError = error.response?.data?.detail || error.message || 'Face verification service is unavailable.'
    return {
      match: false,
      similarity: 0,
      confidence: 0,
      provider: 'unavailable',
      status: 'NOT_RUN',
      label: 'Face service unavailable',
      documentFaceBase64: null,
      observations: [
        {
          title: 'AWS connection',
          status: 'REVIEW',
          detail: serviceError
        }
      ],
      error: serviceError
    }
  }
}
