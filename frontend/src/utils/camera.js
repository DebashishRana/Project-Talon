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

export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(reader.error || new Error('Could not read file.'))
    reader.readAsDataURL(file)
  })
}
