export type ScanState =
  | 'idle'
  | 'selecting'
  | 'uploading'
  | 'extracting'
  | 'review'
  | 'applying'
  | 'done'
  | 'error';

export interface ScanDebugInfo {
  fileSelected: boolean;
  uploadStarted: boolean;
  uploadDone: boolean;
  ocrStarted: boolean;
  ocrDone: boolean;
  lastError: string | null;
}

export interface ExtractedLine {
  id: string;
  description: string;
  hours: number;
  laborType: 'warranty' | 'customer-pay' | 'internal';
  confidence: number;
}

export interface CandidateDate {
  value: string; // YYYY-MM-DD
  source: 'header' | 'text';
  originalFormat: string;
}

export interface ExtractedData {
  roNumber: string | null;
  advisor: string | null;
  date: string | null;
  customerName: string | null;
  mileage: string | null;
  vehicleYear: number | null;
  vehicleMake: string | null;
  vehicleModel: string | null;
  candidateDates: CandidateDate[];
  lines: ExtractedLine[];
  fieldConfidence: {
    roNumber: number;
    advisor: number;
    date: number;
  };
}

export interface ScanSession {
  state: ScanState;
  debug: ScanDebugInfo;
  imagePreviewUrl: string | null;
  storagePath: string | null;
  extractedData: ExtractedData | null;
  templateId: string | null;
  errorMessage: string | null;
}

export function createScanSession(): ScanSession {
  return {
    state: 'idle',
    debug: {
      fileSelected: false,
      uploadStarted: false,
      uploadDone: false,
      ocrStarted: false,
      ocrDone: false,
      lastError: null,
    },
    imagePreviewUrl: null,
    storagePath: null,
    extractedData: null,
    templateId: null,
    errorMessage: null,
  };
}

export function generateLineId(): string {
  return Date.now().toString() + Math.random().toString(36).substring(2, 9);
}
