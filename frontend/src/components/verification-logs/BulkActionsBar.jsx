import React from 'react'

function BulkActionsBar({ count, onExport, onDelete }) {
  if (!count) return null

  return (
    <div className="vl-bulk-bar">
      <strong>{count} selected</strong>
      <div>
        <button type="button" onClick={onExport}>Export CSV</button>
        <button type="button" disabled>Assign to officer</button>
        <button className="danger" type="button" onClick={onDelete}>Delete</button>
      </div>
    </div>
  )
}

export default BulkActionsBar
