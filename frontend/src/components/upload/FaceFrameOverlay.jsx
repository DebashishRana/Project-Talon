import React from 'react'

function FaceFrameOverlay({ stable = false, instruction = 'Position your face in the circle' }) {
  return (
    <div className="face-frame-wrap">
      <div className={`face-frame ${stable ? 'stable' : ''}`} aria-hidden="true" />
      <p>{instruction}</p>
    </div>
  )
}

export default FaceFrameOverlay
