export type SessionStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'VERIFIED'
  | 'FLAGGED'
  | 'MANUAL_REVIEW'
  | 'REJECTED'
  | 'CANCELLED';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type PipelineStage =
  | 'CLASSIFICATION'
  | 'OCR'
  | 'MRZ'
  | 'FORENSICS'
  | 'BIOMETRICS'
  | 'CSII';

export type CSIIStatus = 'OFF' | 'ON' | 'MONITORING';

export interface PipelineResult {
  stage: PipelineStage;
  status: 'PASS' | 'FAIL' | 'WARN' | 'SKIPPED';
  confidence?: number;
  detail?: string;
}

export interface Session {
  id: string;
  createdAt: string;
  updatedAt: string;
  subjectNameMasked: string;
  subjectNationality: string;
  subjectDobMasked: string;
  // Legacy field name retained for persisted sessions. New records contain an
  // opaque, non-biometric session evidence reference such as FACE-REF-ABC123.
  faceHash: string;
  faceReferenceType?: 'SESSION_EVIDENCE_REFERENCE';
  documentType: 'PASSPORT' | 'VISA' | 'AADHAAR' | 'PAN' | 'DRIVING_LICENSE' | 'NATIONAL_PERMIT' | 'PERMIT';
  documentNumberMasked: string;
  documentCountry: string;
  pipeline: PipelineResult[];
  status: SessionStatus;
  riskLevel: RiskLevel;
  riskScore: number;
  officerId: string;
  officerName: string;
  checkpointId: string;
  checkpointName: string;
  checkpointStateCode?: string;
  csiiStatus: CSIIStatus;
  csiiAnomalyCount: number;
  csiiAnomalies: string[];
  notes?: string;
}

export interface SessionFilters {
  searchQuery: string;
  statuses: SessionStatus[];
  riskLevels: RiskLevel[];
  documentTypes: string[];
  officerIds: string[];
  checkpointIds: string[];
  dateRange: { from?: Date; to?: Date };
  csiiStatus: CSIIStatus[];
}
