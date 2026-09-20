import React from 'react'

const FaceFrameOverlay = React.forwardRef(function FaceFrameOverlay(
  { stable = false, state = 'searching', instruction = 'Position your face in the oval' },
  ref
) {
  const stateClass = stable ? 'stable' : state
  return (
    <div className="face-frame-wrap">
      <div ref={ref} className={`face-frame ${stateClass}`} aria-hidden="true" />
      <p>{instruction}</p>
    </div>
  )
})

export default FaceFrameOverlay
