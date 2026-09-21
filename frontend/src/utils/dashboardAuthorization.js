const rolePolicies = {
  admin: {
    canInitiateVerification: true,
    canReview: true,
    canApprove: true,
    canReject: true,
    canFlag: true,
    canViewEvidence: true
  },
  reviewer: {
    canInitiateVerification: false,
    canReview: true,
    canApprove: true,
    canReject: true,
    canFlag: true,
    canViewEvidence: true
  },
  operator: {
    canInitiateVerification: true,
    canReview: false,
    canApprove: false,
    canReject: false,
    canFlag: true,
    canViewEvidence: true
  },
  viewer: {
    canInitiateVerification: false,
    canReview: false,
    canApprove: false,
    canReject: false,
    canFlag: false,
    canViewEvidence: true
  }
}

export function getDashboardPermissions(role = 'admin') {
  const normalizedRole = role === 'super_admin' ? 'admin' : role === 'operative' ? 'operator' : role
  return rolePolicies[normalizedRole] || rolePolicies.viewer
}

export function actionsForRecord(record, permissions = rolePolicies.operator) {
  const actions = [
    { id: 'view', label: 'View details', enabled: true },
    { id: 'evidence', label: 'View verification evidence', enabled: permissions.canViewEvidence }
  ]

  if (record.status === 'flagged' || record.status === 'pending') {
    actions.push({ id: 'review', label: 'Review verification', enabled: permissions.canReview })
  }
  if (record.status !== 'approved') {
    actions.push({ id: 'approve', label: 'Approve', enabled: permissions.canApprove })
  }
  if (record.status !== 'rejected') {
    actions.push({ id: 'reject', label: 'Reject', enabled: permissions.canReject })
  }
  if (record.status !== 'flagged') {
    actions.push({ id: 'flag', label: 'Flag for manual review', enabled: permissions.canFlag })
  }

  return actions.filter(action => action.enabled)
}
