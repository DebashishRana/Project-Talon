import React from 'react'
import { MoreHorizontal } from 'lucide-react'

export default function ActionMenu({ actions, onAction }) {
  return (
    <details className="vd-action-menu" onClick={event => event.stopPropagation()}>
      <summary aria-label="Record actions"><MoreHorizontal size={17} /></summary>
      <div>
        {actions.map(action => (
          <button className={action.id === 'reject' ? 'danger' : ''} type="button" key={action.id} onClick={() => onAction(action.id)}>
            {action.label}
          </button>
        ))}
      </div>
    </details>
  )
}
