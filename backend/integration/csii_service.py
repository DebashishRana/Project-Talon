"""Synthetic-only Cross-Session Identity Intelligence (CSII) demo service.

This module deliberately contains no Aadhaar, immigration, or biometric-provider
connector. Its records are controlled fixtures that exercise the same correlation
and anomaly rules a production middleware adapter would call.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
import hashlib
import hmac
import re
import uuid
from typing import Any, Dict, Iterable, List


MODE = "SYNTHETIC_DEMO"


def _normalized(value: str) -> str:
    return re.sub(r"\s+", " ", str(value or "").strip().upper())


def _token(secret: str, domain: str, value: str) -> str:
    """Create an opaque, domain-separated correlation token."""
    payload = f"{domain}:{_normalized(value)}".encode("utf-8")
    return hmac.new(secret.encode("utf-8"), payload, hashlib.sha256).hexdigest()


@dataclass(frozen=True)
class IdentityLink:
    id: str
    face_anchor_id: str
    name_token: str
    dob_token: str
    label: str
    role: str


@dataclass(frozen=True)
class DocumentLink:
    id: str
    face_anchor_id: str
    document_token: str
    label: str
    role: str


@dataclass(frozen=True)
class TravelEvent:
    id: str
    face_anchor_id: str
    event_type: str
    location_code: str
    timestamp: str
    source: str


def _parse_timestamp(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def _minimum_travel_hours(origin: str, destination: str) -> float:
    known_routes = {
        ("DXB", "RAX"): 4.5,
        ("RAX", "DXB"): 4.5,
        ("DEL", "DXB"): 3.5,
        ("DXB", "DEL"): 3.5,
        ("DEL", "RAX"): 1.5,
        ("RAX", "DEL"): 1.5,
    }
    return known_routes.get((origin, destination), 4.0)


def _identity_anomalies(identities: Iterable[IdentityLink], face_anchor_id: str) -> List[Dict[str, Any]]:
    linked = [item for item in identities if item.face_anchor_id == face_anchor_id]
    identities_by_token = {(item.name_token, item.dob_token) for item in linked}
    dob_tokens = {item.dob_token for item in linked}
    anomalies: List[Dict[str, Any]] = []

    if len(identities_by_token) > 1:
        anomalies.append({
            "type": "IDENTITY_HOPPING",
            "severity": "HIGH" if len(identities_by_token) == 2 else "CRITICAL",
            "title": "Identity correlation conflict",
            "explanation": "One synthetic face anchor is linked to more than one identity record.",
        })
    if len(dob_tokens) > 1:
        anomalies.append({
            "type": "DOB_DIVERGENCE",
            "severity": "HIGH" if len(dob_tokens) == 2 else "CRITICAL",
            "title": "Date-of-birth divergence",
            "explanation": "Linked synthetic identity records contain incompatible dates of birth.",
        })
    return anomalies


def _document_anomalies(documents: Iterable[DocumentLink], current_document_token: str) -> List[Dict[str, Any]]:
    matched = [item for item in documents if item.document_token == current_document_token]
    face_anchors = {item.face_anchor_id for item in matched}
    if len(face_anchors) < 2:
        return []
    return [{
        "type": "DOCUMENT_REUSE",
        "severity": "CRITICAL",
        "title": "Document reuse conflict",
        "explanation": "One synthetic document token appears with different face anchors across sessions.",
    }]


def _travel_anomalies(events: Iterable[TravelEvent], face_anchor_id: str) -> List[Dict[str, Any]]:
    linked = sorted(
        (item for item in events if item.face_anchor_id == face_anchor_id),
        key=lambda item: item.timestamp,
    )
    anomalies: List[Dict[str, Any]] = []
    for prior, later in zip(linked, linked[1:]):
        elapsed = (_parse_timestamp(later.timestamp) - _parse_timestamp(prior.timestamp)).total_seconds() / 3600
        required = _minimum_travel_hours(prior.location_code, later.location_code)
        if elapsed < required:
            anomalies.append({
                "type": "IMPOSSIBLE_TRAVEL",
                "severity": "CRITICAL",
                "title": "Travel-time conflict",
                "explanation": (
                    f"Synthetic travel from {prior.location_code} to {later.location_code} took "
                    f"{elapsed:.1f} hours; the demo minimum is {required:.1f} hours."
                ),
                "actual_hours": round(elapsed, 1),
                "required_hours": required,
            })
    return anomalies


def _score(anomalies: List[Dict[str, Any]]) -> float:
    weights = {"LOW": 0.25, "MEDIUM": 0.5, "HIGH": 0.75, "CRITICAL": 1.0}
    if not anomalies:
        return 0.0
    maximum = max(weights[item["severity"]] for item in anomalies)
    return round(min(1.0, maximum * (1 + 0.1 * (len(anomalies) - 1))), 2)


def _node(node_id: str, node_type: str, label: str, subtitle: str, x: int, y: int, severity: str = "normal", details: Dict[str, Any] | None = None) -> Dict[str, Any]:
    return {
        "id": node_id,
        "type": node_type,
        "label": label,
        "subtitle": subtitle,
        "severity": severity,
        "position": {"x": x, "y": y},
        "details": details or {},
    }


def _edge(edge_id: str, source: str, target: str, edge_type: str, severity: str = "normal", label: str | None = None) -> Dict[str, Any]:
    return {
        "id": edge_id,
        "source": source,
        "target": target,
        "type": edge_type,
        "severity": severity,
        "label": label,
    }


def analyze_demo(*, secret: str, name: str, dob: str, document_number: str, document_type: str, nationality: str, scenario: str) -> Dict[str, Any]:
    """Build a deterministic, synthetic CSII run for the supplied scenario."""
    valid_scenarios = {"clear", "travel_alert", "identity_conflict", "combined"}
    scenario = scenario if scenario in valid_scenarios else "travel_alert"
    run_id = f"CSII-DEMO-{uuid.uuid4().hex[:8].upper()}"
    face_anchor_id = "face-anchor-current-demo"
    name_token = _token(secret, "name", name or "current-session")
    dob_token = _token(secret, "dob", dob or "unknown")
    document_token = _token(secret, "document", document_number or f"{document_type}-unknown")

    identities = [
        IdentityLink("identity-current", face_anchor_id, name_token, dob_token, "Current verification identity", "current"),
    ]
    documents = [
        DocumentLink("document-current", face_anchor_id, document_token, f"{document_type.title()} token", "current"),
    ]
    events = [
        TravelEvent("travel-del", face_anchor_id, "EXIT", "DEL", "2026-09-19T03:00:00Z", "SYNTHETIC_TRAVEL_LEDGER"),
        TravelEvent("travel-dxb", face_anchor_id, "ENTRY", "DXB", "2026-09-19T08:30:00Z", "SYNTHETIC_TRAVEL_LEDGER"),
    ]

    if scenario in {"identity_conflict", "combined"}:
        identities.append(IdentityLink(
            "identity-alias", face_anchor_id, _token(secret, "name", "synthetic-alias"),
            _token(secret, "dob", "1985-11-03"), "Historical identity record", "historical",
        ))
    if scenario == "combined":
        documents.append(DocumentLink(
            "document-historical", "face-anchor-historical-demo", document_token,
            f"{document_type.title()} token in prior case", "historical",
        ))
    if scenario in {"travel_alert", "combined"}:
        events = [
            TravelEvent("travel-dxb", face_anchor_id, "EXIT", "DXB", "2026-10-14T08:00:00Z", "SYNTHETIC_TRAVEL_LEDGER"),
            TravelEvent("travel-rax", face_anchor_id, "ENTRY", "RAX", "2026-10-14T10:30:00Z", "SYNTHETIC_TRAVEL_LEDGER"),
        ]

    anomalies = [
        *_identity_anomalies(identities, face_anchor_id),
        *_document_anomalies(documents, document_token),
        *_travel_anomalies(events, face_anchor_id),
    ]

    nodes = [
        _node("face-current", "face", "Face anchor", "Synthetic correlation anchor", 70, 210, "critical" if anomalies else "normal", {"anchor_id": "FACE-ANCHOR-DEMO-01"}),
        _node("identity-current", "identity", "Current identity", "Pseudonymous current-session token", 315, 100, "normal", {"nationality": nationality or "UNKNOWN"}),
        _node("aadhaar-demo", "aadhaar", "Aadhaar reference", "Synthetic offline identity layer", 570, 42, "normal", {"reference": "DEMO-XXXX-2084", "source": "SYNTHETIC_AADHAAR_LAYER"}),
        _node("document-current", "document", f"{document_type.title()} record", "Pseudonymous document token", 575, 215, "critical" if any(item["type"] == "DOCUMENT_REUSE" for item in anomalies) else "normal"),
    ]
    edges = [
        _edge("face-identity", "face-current", "identity-current", "MATCHES_FACE"),
        _edge("identity-aadhaar", "identity-current", "aadhaar-demo", "IDENTITY_REFERENCE"),
        _edge("identity-document", "identity-current", "document-current", "HOLDS"),
    ]

    if any(item.id == "identity-alias" for item in identities):
        nodes.append(_node("identity-alias", "identity", "Historical identity", "Synthetic conflicting identity", 315, 335, "critical"))
        edges.append(_edge("identity-conflict", "face-current", "identity-alias", "IDENTITY_HOPPING", "critical", "IDENTITY CONFLICT"))
    if scenario == "combined":
        nodes.append(_node("face-historical", "face", "Prior face anchor", "Synthetic historical case", 825, 235, "critical"))
        edges.append(_edge("document-reuse", "document-current", "face-historical", "DOCUMENT_REUSE", "critical", "DOCUMENT REUSE"))

    for index, event in enumerate(events):
        node_id = f"event-{event.id}"
        nodes.append(_node(
            node_id,
            "travel",
            f"{event.event_type} {event.location_code}",
            f"{event.timestamp.replace('T', ' ').replace('Z', ' UTC')}",
            310 + index * 260,
            485,
            "critical" if scenario in {"travel_alert", "combined"} else "normal",
            {"source": event.source, "event_type": event.event_type, "location": event.location_code},
        ))
        edges.append(_edge(f"travel-link-{event.id}", "identity-current", node_id, "TRAVEL"))

    if scenario in {"travel_alert", "combined"}:
        edges.append(_edge("travel-conflict", "event-travel-dxb", "event-travel-rax", "IMPOSSIBLE_TRAVEL", "critical", "TRAVEL-TIME CONFLICT"))

    return {
        "run_id": run_id,
        "mode": MODE,
        "scenario": scenario,
        "status": "REVIEW" if anomalies else "CLEAR",
        "signal_score": _score(anomalies),
        "summary": "Synthetic CSII demo records only. No Aadhaar, immigration, or external identity system was queried.",
        "anomalies": anomalies,
        "graph": {"nodes": nodes, "edges": edges},
        "source_layers": ["Synthetic Aadhaar reference", "Synthetic travel ledger"],
        "completed_at": datetime.now(timezone.utc).isoformat(),
    }
