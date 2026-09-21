export const INDIA_STATES = [
  ['AP', 'Andhra Pradesh', 'Amaravati'],
  ['AR', 'Arunachal Pradesh', 'Itanagar'],
  ['AS', 'Assam', 'Dispur'],
  ['BR', 'Bihar', 'Patna'],
  ['CG', 'Chhattisgarh', 'Raipur'],
  ['GA', 'Goa', 'Panaji'],
  ['GJ', 'Gujarat', 'Gandhinagar'],
  ['HR', 'Haryana', 'Chandigarh'],
  ['HP', 'Himachal Pradesh', 'Shimla'],
  ['JH', 'Jharkhand', 'Ranchi'],
  ['KA', 'Karnataka', 'Bengaluru'],
  ['KL', 'Kerala', 'Thiruvananthapuram'],
  ['MP', 'Madhya Pradesh', 'Bhopal'],
  ['MH', 'Maharashtra', 'Mumbai'],
  ['MN', 'Manipur', 'Imphal'],
  ['ML', 'Meghalaya', 'Shillong'],
  ['MZ', 'Mizoram', 'Aizawl'],
  ['NL', 'Nagaland', 'Kohima'],
  ['OD', 'Odisha', 'Bhubaneswar'],
  ['PB', 'Punjab', 'Chandigarh'],
  ['RJ', 'Rajasthan', 'Jaipur'],
  ['SK', 'Sikkim', 'Gangtok'],
  ['TN', 'Tamil Nadu', 'Chennai'],
  ['TS', 'Telangana', 'Hyderabad'],
  ['TR', 'Tripura', 'Agartala'],
  ['UK', 'Uttarakhand', 'Dehradun (summer: Gairsain)'],
  ['UP', 'Uttar Pradesh', 'Lucknow'],
  ['WB', 'West Bengal', 'Kolkata']
].map(([code, name, capital]) => ({ code, name, capital }))

// Catalog entries provide locations only; they never create session activity.
export const DEFAULT_CHECKPOINTS = [
  ['raxaul', 'Raxaul', 'BR'], ['jogbani', 'Jogbani', 'BR'],
  ['jhulaghat', 'Jhulaghat', 'UK'], ['haldwani', 'Haldwani', 'UK'],
  ['banbasa', 'Banbasa', 'UK'], ['dharchula', 'Dharchula', 'UK'],
  ['bagdogra', 'Bagdogra', 'WB'], ['panitanki', 'Panitanki', 'WB'],
  ['petrapole', 'Petrapole', 'WB'], ['changrabandha', 'Changrabandha', 'WB'],
  ['jaigaon', 'Jaigaon', 'WB'], ['hili', 'Hili', 'WB'],
  ['sonauli', 'Sonauli', 'UP'], ['rupaidiha', 'Rupaidiha', 'UP'],
  ['gauriphanta', 'Gauriphanta', 'UP'], ['lucknow-airport', 'Lucknow Airport', 'UP'],
  ['attari', 'Attari', 'PB'], ['amritsar-airport', 'Amritsar Airport', 'PB'],
  ['moreh', 'Moreh', 'MN'], ['imphal-airport', 'Imphal Airport', 'MN'],
  ['dawki', 'Dawki', 'ML'], ['shillong-airport', 'Shillong Airport', 'ML'],
  ['agartala', 'Agartala', 'TR'], ['srimantapur', 'Srimantapur', 'TR'],
  ['sutarkandi', 'Sutarkandi', 'AS'], ['darranga', 'Darranga', 'AS'],
  ['guwahati-airport', 'Guwahati Airport', 'AS'], ['zokhawthar', 'Zokhawthar', 'MZ'],
  ['lengpui-airport', 'Lengpui Airport', 'MZ'], ['nathu-la', 'Nathu La', 'SK'],
  ['pakyong-airport', 'Pakyong Airport', 'SK'],
  ['itanagar-airport', 'Itanagar Airport', 'AR'], ['dimapur-airport', 'Dimapur Airport', 'NL'],
  ['vijayawada-airport', 'Vijayawada Airport', 'AP'], ['visakhapatnam-airport', 'Visakhapatnam Airport', 'AP'],
  ['raipur-airport', 'Raipur Airport', 'CG'], ['dabolim-airport', 'Dabolim Airport', 'GA'],
  ['mopa-airport', 'Mopa Airport', 'GA'], ['ahmedabad-airport', 'Ahmedabad Airport', 'GJ'],
  ['surat-airport', 'Surat Airport', 'GJ'], ['hisar-airport', 'Hisar Airport', 'HR'],
  ['kangra-airport', 'Kangra Airport', 'HP'], ['ranchi-airport', 'Ranchi Airport', 'JH'],
  ['bengaluru-airport', 'Bengaluru Airport', 'KA'], ['mangaluru-airport', 'Mangaluru Airport', 'KA'],
  ['kochi-airport', 'Kochi Airport', 'KL'], ['thiruvananthapuram-airport', 'Thiruvananthapuram Airport', 'KL'],
  ['indore-airport', 'Indore Airport', 'MP'], ['bhopal-airport', 'Bhopal Airport', 'MP'],
  ['mumbai-airport', 'Mumbai Airport', 'MH'], ['pune-airport', 'Pune Airport', 'MH'],
  ['bhubaneswar-airport', 'Bhubaneswar Airport', 'OD'], ['jaipur-airport', 'Jaipur Airport', 'RJ'],
  ['chennai-airport', 'Chennai Airport', 'TN'], ['tiruchirappalli-airport', 'Tiruchirappalli Airport', 'TN'],
  ['hyderabad-airport', 'Hyderabad Airport', 'TS']
].map(([slug, name, stateCode]) => ({ id: `checkpoint-${slug}`, name, stateCode }))

const normalize = value => String(value || '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('en-IN')

export function resolveCheckpoint(reference, checkpoints = DEFAULT_CHECKPOINTS) {
  const key = normalize(reference)
  if (!key) return undefined
  return checkpoints.find(item => normalize(item.id) === key) ||
    checkpoints.find(item => normalize(item.name) === key)
}

export function getSessionCheckpoint(session, checkpoints = DEFAULT_CHECKPOINTS) {
  const known = resolveCheckpoint(session.checkpointId, checkpoints) || resolveCheckpoint(session.checkpointName, checkpoints)
  const storedState = INDIA_STATES.some(state => state.code === session.checkpointStateCode) ? session.checkpointStateCode : ''
  return {
    id: known?.id || session.checkpointId || session.checkpointName || 'unassigned',
    name: session.checkpointName || known?.name || 'Unassigned checkpoint',
    stateCode: storedState || known?.stateCode || ''
  }
}

export function validateCheckpoint(input, checkpoints = DEFAULT_CHECKPOINTS) {
  const name = String(input.name || '').trim().replace(/\s+/g, ' ')
  if (name.length < 2 || name.length > 80 || /[\u0000-\u001f\u007f]/.test(name)) {
    throw new Error('Enter a checkpoint name between 2 and 80 characters.')
  }
  if (!INDIA_STATES.some(state => state.code === input.stateCode)) throw new Error('Select a valid state.')
  if (checkpoints.some(item => item.stateCode === input.stateCode && normalize(item.name) === normalize(name))) {
    throw new Error('This checkpoint already exists in the selected state.')
  }
  return { name, stateCode: input.stateCode }
}

export function canManageCheckpoints(user, role) {
  if (user?.status !== 'ACTIVE' || user.roleId !== role?.id || role?.id === 'auditor') return false
  return role.id === 'super_admin' || role.permissions?.some(item =>
    ['settings', 'user_access'].includes(item.module) && (item.create || item.update)) || false
}
