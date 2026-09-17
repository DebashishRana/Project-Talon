import React from 'react'

function ProgressBar({ step = 1 }) {
  const progress = Math.min(100, Math.max(20, step * 20))
  return (
    <div className="upload-progress-bar" aria-label={`Step ${step} of 5`}>
      <span style={{ width: `${progress}%` }} />
    </div>
  )
}

export default ProgressBar
