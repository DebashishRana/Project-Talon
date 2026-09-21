import api from './api'

function errorMessage(error) {
  return error.response?.data?.detail || error.message || 'CSII analysis could not be completed.'
}

export async function analyzeCsii({ fields, documentType, scenario = 'travel_alert' }) {
  try {
    const response = await api.post('/api/csii/analyze', {
      name: fields.name || '',
      date_of_birth: fields.dob || '',
      document_number: fields.documentNumber || '',
      document_type: documentType || 'PASSPORT',
      nationality: fields.nationality || '',
      scenario
    })
    return response.data
  } catch (error) {
    throw new Error(errorMessage(error))
  }
}
