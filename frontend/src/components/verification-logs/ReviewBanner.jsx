import React from 'react'

function ReviewBanner({ count, onApplyReviewFilter }) {
  if (count > 0) {
    return (
      <button className="vl-review-banner warning" type="button" onClick={onApplyReviewFilter}>
        <span aria-hidden="true">!</span>
        {count} session{count === 1 ? '' : 's'} awaiting your review
      </button>
    )
  }

  return (
    <div className="vl-review-banner clear">
      <span aria-hidden="true">✓</span>
      No sessions awaiting review
    </div>
  )
}

export default ReviewBanner
