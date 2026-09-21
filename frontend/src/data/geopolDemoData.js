export const GEOPOL_METRICS = [
  { id: 'activity', label: 'Verification volume', description: 'Total verification sessions processed at each checkpoint.' },
  { id: 'risk', label: 'High-risk density', description: 'Sessions where review, rejection, or strong anomaly signals were produced.' },
  { id: 'face', label: 'Face mismatch density', description: 'Live-to-document face comparisons below review threshold.' },
  { id: 'csii', label: 'CSII anomaly density', description: 'Synthetic cross-session identity intelligence alerts.' }
]

export const GEOPOL_CHECKPOINTS = [
  { id: 'raxual-icp', name: 'Raxaul ICP', state: 'Bihar', type: 'Land checkpoint', coordinates: [84.8507, 26.9836], activity: 118, risk: 31, face: 14, csii: 18, lastSeen: '10:42 IST' },
  { id: 'petrapole-icp', name: 'Petrapole ICP', state: 'West Bengal', type: 'Land checkpoint', coordinates: [88.8858, 23.0536], activity: 96, risk: 22, face: 9, csii: 12, lastSeen: '10:25 IST' },
  { id: 'attari-icp', name: 'Attari ICP', state: 'Punjab', type: 'Land checkpoint', coordinates: [74.6052, 31.6046], activity: 74, risk: 19, face: 7, csii: 9, lastSeen: '09:58 IST' },
  { id: 'moreh-icp', name: 'Moreh ICP', state: 'Manipur', type: 'Land checkpoint', coordinates: [94.3013, 24.2475], activity: 58, risk: 17, face: 8, csii: 11, lastSeen: '09:38 IST' },
  { id: 'sonauli-icp', name: 'Sonauli ICP', state: 'Uttar Pradesh', type: 'Land checkpoint', coordinates: [83.4261, 27.4925], activity: 64, risk: 15, face: 6, csii: 8, lastSeen: '10:12 IST' },
  { id: 'igi-delhi', name: 'Delhi IGI', state: 'Delhi', type: 'Airport', coordinates: [77.1008, 28.5562], activity: 142, risk: 24, face: 11, csii: 10, lastSeen: '10:48 IST' },
  { id: 'mumbai-airport', name: 'Mumbai Airport', state: 'Maharashtra', type: 'Airport', coordinates: [72.8747, 19.0896], activity: 129, risk: 18, face: 9, csii: 7, lastSeen: '10:33 IST' },
  { id: 'kolkata-airport', name: 'Kolkata Airport', state: 'West Bengal', type: 'Airport', coordinates: [88.4467, 22.6547], activity: 82, risk: 16, face: 5, csii: 6, lastSeen: '09:52 IST' },
  { id: 'chennai-airport', name: 'Chennai Airport', state: 'Tamil Nadu', type: 'Airport', coordinates: [80.1636, 12.9941], activity: 76, risk: 12, face: 5, csii: 5, lastSeen: '09:31 IST' },
  { id: 'guwahati-airport', name: 'Guwahati Airport', state: 'Assam', type: 'Airport', coordinates: [91.5859, 26.1061], activity: 52, risk: 13, face: 4, csii: 8, lastSeen: '08:57 IST' },
  { id: 'agartala-icp', name: 'Agartala ICP', state: 'Tripura', type: 'Land checkpoint', coordinates: [91.2868, 23.8315], activity: 44, risk: 10, face: 3, csii: 6, lastSeen: '08:34 IST' },
  { id: 'bagdogra-airport', name: 'Bagdogra Airport', state: 'West Bengal', type: 'Airport', coordinates: [88.3286, 26.6812], activity: 49, risk: 9, face: 4, csii: 5, lastSeen: '08:26 IST' }
]

export const GEOPOL_TRAILS = [
  {
    id: 'talon-20260921-raxual-delhi-mumbai',
    subject: 'RAHUL S****',
    document: 'VISA · IND · J12****7',
    risk: 'Review',
    summary: 'Synthetic route built from verification timestamps. Raxaul to Delhi to Mumbai within one operational day.',
    events: [
      { id: 'trail-1', checkpointId: 'raxual-icp', name: 'Raxaul ICP', coordinates: [84.8507, 26.9836], type: 'ENTRY', time: '08:20 IST', score: 0.84 },
      { id: 'trail-2', checkpointId: 'igi-delhi', name: 'Delhi IGI', coordinates: [77.1008, 28.5562], type: 'CHECK-IN', time: '14:45 IST', score: 0.62 },
      { id: 'trail-3', checkpointId: 'mumbai-airport', name: 'Mumbai Airport', coordinates: [72.8747, 19.0896], type: 'EXIT', time: '20:10 IST', score: 0.48 }
    ]
  },
  {
    id: 'talon-20260921-petrapole-kolkata-bagdogra',
    subject: 'MINT W****',
    document: 'PASSPORT · IND · ZA270***',
    risk: 'Low',
    summary: 'Synthetic low-risk trail showing repeated document consistency across eastern checkpoints.',
    events: [
      { id: 'trail-4', checkpointId: 'petrapole-icp', name: 'Petrapole ICP', coordinates: [88.8858, 23.0536], type: 'ENTRY', time: '07:35 IST', score: 0.93 },
      { id: 'trail-5', checkpointId: 'kolkata-airport', name: 'Kolkata Airport', coordinates: [88.4467, 22.6547], type: 'CHECK-IN', time: '12:10 IST', score: 0.91 },
      { id: 'trail-6', checkpointId: 'bagdogra-airport', name: 'Bagdogra Airport', coordinates: [88.3286, 26.6812], type: 'CHECK-OUT', time: '16:55 IST', score: 0.88 }
    ]
  }
]

export function checkpointsToFeatureCollection(metric = 'risk') {
  return {
    type: 'FeatureCollection',
    features: GEOPOL_CHECKPOINTS.map(checkpoint => ({
      type: 'Feature',
      id: checkpoint.id,
      properties: {
        ...checkpoint,
        weight: checkpoint[metric] || 0
      },
      geometry: {
        type: 'Point',
        coordinates: checkpoint.coordinates
      }
    }))
  }
}

export function trailToFeatureCollection(trail) {
  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: { id: trail.id, subject: trail.subject },
        geometry: {
          type: 'LineString',
          coordinates: trail.events.map(event => event.coordinates)
        }
      },
      ...trail.events.map((event, index) => ({
        type: 'Feature',
        id: event.id,
        properties: { ...event, sequence: index + 1 },
        geometry: { type: 'Point', coordinates: event.coordinates }
      }))
    ]
  }
}
