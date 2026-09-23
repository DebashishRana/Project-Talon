import React, { useMemo, useState } from 'react'
import { Background, Controls, Handle, MarkerType, Position, ReactFlow } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { AlertTriangle, FileText, Fingerprint, Network, Plane, ShieldCheck, UserRound, X } from 'lucide-react'
import './CSIIGraphDialog.css'

const iconByType = {
  face: Fingerprint,
  identity: UserRound,
  aadhaar: ShieldCheck,
  document: FileText,
  travel: Plane,
}

const filters = [
  { id: 'all', label: 'All evidence' },
  { id: 'identity', label: 'Identity' },
  { id: 'document', label: 'Documents' },
  { id: 'travel', label: 'Travel' },
  { id: 'anomaly', label: 'Anomalies' },
]

function typeLabel(value) {
  return String(value || '').replaceAll('_', ' ')
}

function CSIINode({ data }) {
  const Icon = iconByType[data.type] || Network
  return (
    <div className={`csii-node ${data.type} ${data.severity}`}>
      <Handle type="target" position={Position.Left} />
      <span className="csii-node-icon"><Icon size={17} /></span>
      <div><strong>{data.label}</strong><small>{data.subtitle}</small></div>
      <Handle type="source" position={Position.Right} />
    </div>
  )
}

const nodeTypes = { csii: CSIINode }

function allows(filter, node) {
  if (filter === 'all') return true
  if (filter === 'anomaly') return node.severity === 'critical'
  if (filter === 'identity') return ['face', 'identity', 'aadhaar'].includes(node.type)
  if (filter === 'document') return ['face', 'identity', 'document'].includes(node.type)
  if (filter === 'travel') return ['face', 'identity', 'travel'].includes(node.type)
  return node.type === filter
}

function toFlowGraph(graph, filter) {
  const initialNodes = Array.isArray(graph?.nodes) ? graph.nodes : []
  const initialEdges = Array.isArray(graph?.edges) ? graph.edges : []
  const visibleIds = new Set(initialNodes.filter(node => allows(filter, node)).map(node => node.id))

  if (filter === 'anomaly') {
    initialEdges.filter(edge => edge.severity === 'critical').forEach(edge => {
      visibleIds.add(edge.source)
      visibleIds.add(edge.target)
    })
  }

  const nodes = initialNodes
    .filter(node => visibleIds.has(node.id))
    .map(node => ({ id: node.id, type: 'csii', position: node.position, data: node }))
  const edges = initialEdges
    .filter(edge => visibleIds.has(edge.source) && visibleIds.has(edge.target))
    .map(edge => ({
      ...edge,
      type: 'default',
      data: { relationship: edge.type },
      animated: edge.severity === 'critical' && !['TRAVEL_EVENT', 'IMPOSSIBLE_TRAVEL'].includes(edge.type),
      markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 },
      className: `csii-edge ${edge.severity || 'normal'} ${edge.type.toLowerCase()}`,
      label: edge.displayLabel ?? (['TRAVEL_EVENT', 'IMPOSSIBLE_TRAVEL'].includes(edge.type) ? '' : edge.label),
      labelStyle: ['TRAVEL_EVENT', 'IMPOSSIBLE_TRAVEL'].includes(edge.type)
        ? { fill: '#15803d', fontSize: 10, fontWeight: 700 }
        : { fill: '#334155', fontSize: 10, fontWeight: 800 },
      labelBgStyle: { fill: '#ffffff', fillOpacity: 0.92 },
      labelBgPadding: [8, 4],
    }))
  return { nodes, edges }
}

function scenarioLabel(value) {
  return {
    clear: 'Clear correlation',
    travel_alert: 'Travel-time alert',
    identity_conflict: 'Identity conflict',
    combined: 'Combined anomalies',
  }[value] || 'Travel-time alert'
}

export default function CSIIGraphDialog({ result, loading, error, onClose, onScenarioChange }) {
  const [filter, setFilter] = useState('all')
  const [selectedNode, setSelectedNode] = useState(null)
  const graph = useMemo(() => toFlowGraph(result?.graph, filter), [filter, result])
  const selected = graph.nodes.find(node => node.id === selectedNode?.id)?.data || selectedNode?.data || graph.nodes[0]?.data
  const anomalyCount = result?.anomalies?.length || 0

  return (
    <div className="csii-dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="csii-dialog" role="dialog" aria-modal="true" aria-labelledby="csii-dialog-title" onMouseDown={event => event.stopPropagation()}>
        <header className="csii-dialog-header">
          <div>
            <span className="csii-eyebrow"><Network size={15} /> Cross-session identity intelligence</span>
            <h2 id="csii-dialog-title">CSII correlation graph</h2>
            <p>Synthetic demonstration data only. No Aadhaar, immigration, or external identity system was queried.</p>
          </div>
          <button className="csii-close" type="button" onClick={onClose} aria-label="Close CSII graph"><X size={20} /></button>
        </header>

        <div className="csii-toolbar">
          <div className="csii-filter-set" aria-label="Graph filters">
            {filters.map(item => <button key={item.id} type="button" className={filter === item.id ? 'active' : ''} onClick={() => setFilter(item.id)}>{item.label}</button>)}
          </div>
          <label className="csii-scenario-select">Demo scenario
            <select value={result?.scenario || 'travel_alert'} onChange={event => onScenarioChange(event.target.value)} disabled={loading}>
              <option value="clear">Clear correlation</option>
              <option value="travel_alert">Travel-time alert</option>
              <option value="identity_conflict">Identity conflict</option>
              <option value="combined">Combined anomalies</option>
            </select>
          </label>
        </div>

        <div className="csii-workspace">
          <section className="csii-canvas" aria-label="CSII graph canvas">
            {loading ? <div className="csii-state"><Network size={28} /><strong>Building synthetic correlation graph</strong><span>Tokenizing session fields and applying deterministic CSII rules.</span></div>
              : error ? <div className="csii-state error"><AlertTriangle size={28} /><strong>CSII graph unavailable</strong><span>{error}</span></div>
                : <ReactFlow nodes={graph.nodes} edges={graph.edges} nodeTypes={nodeTypes} fitView minZoom={0.35} maxZoom={1.5} onNodeClick={(_, node) => setSelectedNode(node)} proOptions={{ hideAttribution: true }}>
                  <Background color="#dbe5f0" gap={22} size={1} />
                  <Controls showInteractive={false} />
                </ReactFlow>}
          </section>

          <aside className="csii-inspector">
            <div className={`csii-status ${result?.status === 'CLEAR' ? 'clear' : 'review'}`}>
              <span>{result?.status === 'CLEAR' ? 'Clear' : 'Review'}</span>
              <strong>{Math.round(Number(result?.signal_score || 0) * 100)}<small>/100</small></strong>
              <p>CSII advisory signal</p>
            </div>
            <section>
              <span className="csii-inspector-label">Selected evidence</span>
              {selected ? <><strong>{selected.label}</strong><p>{selected.subtitle}</p><dl>{Object.entries(selected.details || {}).map(([key, value]) => <div key={key}><dt>{typeLabel(key)}</dt><dd>{String(value)}</dd></div>)}</dl></> : <p>Choose an evidence node to inspect its synthetic source details.</p>}
            </section>
            <section>
              <span className="csii-inspector-label">Anomalies ({anomalyCount})</span>
              {anomalyCount ? <div className="csii-anomaly-list">{result.anomalies.map(item => <article key={item.type}><AlertTriangle size={16} /><div><strong>{typeLabel(item.type)}</strong><p>{item.explanation}</p></div></article>)}</div> : <p>No conflicts were created by this synthetic scenario.</p>}
            </section>
            <section className="csii-legend">
              <span className="csii-inspector-label">Legend</span>
              <p><i className="face" /> Face anchor <i className="identity" /> Identity <i className="document" /> Document</p>
              <p><i className="aadhaar" /> Aadhaar layer <i className="travel" /> Travel event <i className="critical" /> Alert</p>
            </section>
          </aside>
        </div>
        <footer className="csii-dialog-footer"><span>{result?.run_id || 'Awaiting CSII run'} · {scenarioLabel(result?.scenario)}</span><span>{result?.summary}</span></footer>
      </section>
    </div>
  )
}
