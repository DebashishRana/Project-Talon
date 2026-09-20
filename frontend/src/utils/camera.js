export async function requestCameraStream({ facingMode = 'environment' } = {}) {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('Camera access is not available in this browser.')
  }

  return navigator.mediaDevices.getUserMedia({
    video: {
      facingMode,
      width: { ideal: 1920 },
      height: { ideal: 1080 }
    },
    audio: false
  })
}

export function stopCameraStream(stream) {
  stream?.getTracks?.().forEach(track => track.stop())
}

export function captureVideoFrame(video, quality = 0.9) {
  if (!video?.videoWidth || !video?.videoHeight) {
    throw new Error('Camera preview is not ready yet.')
  }
  const canvas = document.createElement('canvas')
  canvas.width = video.videoWidth
  canvas.height = video.videoHeight
  const context = canvas.getContext('2d')
  context.drawImage(video, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/jpeg', quality)
}

function centeredVideoRect(video) {
  const width = video.videoWidth * 0.42
  const height = video.videoHeight * 0.68
  return {
    x: (video.videoWidth - width) / 2,
    y: (video.videoHeight - height) / 2,
    width,
    height
  }
}

export function videoSourceRectForElement(video, regionElement, stageElement) {
  if (!video?.videoWidth || !video?.videoHeight) {
    throw new Error('Camera preview is not ready yet.')
  }

  const stageRect = stageElement?.getBoundingClientRect?.()
  const regionRect = regionElement?.getBoundingClientRect?.()
  if (!stageRect?.width || !stageRect?.height || !regionRect?.width || !regionRect?.height) {
    return centeredVideoRect(video)
  }

  const scale = Math.max(stageRect.width / video.videoWidth, stageRect.height / video.videoHeight)
  const renderedWidth = video.videoWidth * scale
  const renderedHeight = video.videoHeight * scale
  const offsetX = (stageRect.width - renderedWidth) / 2
  const offsetY = (stageRect.height - renderedHeight) / 2

  const x = (regionRect.left - stageRect.left - offsetX) / scale
  const y = (regionRect.top - stageRect.top - offsetY) / scale
  const width = regionRect.width / scale
  const height = regionRect.height / scale

  const clampedX = Math.max(0, Math.min(video.videoWidth - 1, x))
  const clampedY = Math.max(0, Math.min(video.videoHeight - 1, y))
  return {
    x: clampedX,
    y: clampedY,
    width: Math.max(1, Math.min(video.videoWidth - clampedX, width)),
    height: Math.max(1, Math.min(video.videoHeight - clampedY, height))
  }
}

export function captureFaceOvalFrame(video, regionElement, stageElement, quality = 0.92) {
  const rect = videoSourceRectForElement(video, regionElement, stageElement)
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(rect.width)
  canvas.height = Math.round(rect.height)
  const context = canvas.getContext('2d')
  context.drawImage(video, rect.x, rect.y, rect.width, rect.height, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/jpeg', quality)
}

export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(reader.error || new Error('Could not read file.'))
    reader.readAsDataURL(file)
  })
}
