import React from 'react'

function DocumentFrameOverlay({ instruction = 'Hold steady' }) {
  return (
    <div className="document-frame-wrap">
      <div className="document-frame" aria-hidden="true">
        <i className="tl" /><i className="tr" /><i className="bl" /><i className="br" />
      </div>
      <p>{instruction}</p>
    </div>
  )
}

export default DocumentFrameOverlay
