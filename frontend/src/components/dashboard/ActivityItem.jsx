import React from 'react'
import { ChevronDown } from 'lucide-react'
import StatusBadge from './StatusBadge'

function timeLabel(value) {
  const date = new Date(value)
  return new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' }).format(date)
}

export default function ActivityItem({ activity, onOpen }) {
  return (
    <button className="vd-activity-item" type="button" onClick={() => onOpen(activity.verificationId)}>
      <div>
        <strong>{activity.userName}</strong>
        <span>{activity.eventType}</span>
        <small>{timeLabel(activity.timestamp)} via {activity.source}</small>
      </div>
      <StatusBadge status={activity.status} />
      <ChevronDown size={14} />
    </button>
  )
}
