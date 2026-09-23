const DATABASE_NAME = 'talon_session_media_v1'
const STORE_NAME = 'media'
const MEDIA_FIELDS = ['documentFrontBase64', 'documentBackBase64', 'documentFaceBase64', 'liveFaceBase64']
const MAX_MEDIA_BYTES = 8 * 1024 * 1024

function openDatabase() {
  if (typeof window === 'undefined' || !window.indexedDB) return Promise.resolve(null)
  return new Promise(resolve => {
    const request = window.indexedDB.open(DATABASE_NAME, 1)
    request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => resolve(null)
  })
}

function mediaFor(session = {}) {
  return Object.fromEntries(MEDIA_FIELDS
    .filter(field => typeof session[field] === 'string' && session[field])
    .map(field => [field, session[field]]))
}

function hasSafeSize(media) {
  return Object.values(media).every(value => value.length <= MAX_MEDIA_BYTES)
}

export async function saveSessionMedia(session) {
  const media = mediaFor(session)
  if (!Object.keys(media).length || !hasSafeSize(media)) return false
  const database = await openDatabase()
  if (!database) return false
  return new Promise(resolve => {
    const transaction = database.transaction(STORE_NAME, 'readwrite')
    transaction.objectStore(STORE_NAME).put(media, session.id)
    transaction.oncomplete = () => { database.close(); resolve(true) }
    transaction.onerror = () => { database.close(); resolve(false) }
  })
}

export async function loadSessionMedia(sessionId) {
  const database = await openDatabase()
  if (!database) return {}
  return new Promise(resolve => {
    const request = database.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(sessionId)
    request.onsuccess = () => { database.close(); resolve(request.result || {}) }
    request.onerror = () => { database.close(); resolve({}) }
  })
}

export async function deleteSessionMedia(sessionId) {
  const database = await openDatabase()
  if (!database) return
  await new Promise(resolve => {
    const transaction = database.transaction(STORE_NAME, 'readwrite')
    transaction.objectStore(STORE_NAME).delete(sessionId)
    transaction.oncomplete = transaction.onerror = () => { database.close(); resolve() }
  })
}

export async function clearSessionMedia() {
  const database = await openDatabase()
  if (!database) return
  await new Promise(resolve => {
    const transaction = database.transaction(STORE_NAME, 'readwrite')
    transaction.objectStore(STORE_NAME).clear()
    transaction.oncomplete = transaction.onerror = () => { database.close(); resolve() }
  })
}

export { MEDIA_FIELDS }
