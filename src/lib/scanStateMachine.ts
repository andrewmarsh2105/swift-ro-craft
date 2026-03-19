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
  /** Whether this line is marked as TBD */
  isTbd?: boolean;
  /** Which page this line came from (1-indexed) */
  sourcePage?: number;
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
  vehicleVin: string | null;
  candidateDates: CandidateDate[];
  lines: ExtractedLine[];
  fieldConfidence: {
    roNumber: number;
    advisor: number;
    date: number;
  };
}

/** Represents a single scanned page within a multi-page session */
export interface ScanPage {
  pageId: string;
  pageNumber: number;
  imagePreviewUrl: string | null;
  storagePath: string | null;
  templateId: string | null;
  extractedData: ExtractedData;
}

/** Conflicting header field detected when merging a new page */
export interface HeaderConflict {
  field: 'roNumber' | 'date' | 'mileage';
  existingValue: string;
  newValue: string;
  pageNumber: number;
}

export interface ScanSession {
  state: ScanState;
  debug: ScanDebugInfo;
  /** Preview URL for the currently-processing page */
  imagePreviewUrl: string | null;
  storagePath: string | null;
  /** Merged extracted data across all pages (the "draft") */
  extractedData: ExtractedData | null;
  templateId: string | null;
  errorMessage: string | null;
  /** All pages that have been successfully scanned */
  pages: ScanPage[];
  /** Header conflicts from the latest page that need user resolution */
  pendingHeaderConflicts: HeaderConflict[];
  /** The newly-extracted page data awaiting merge/confirmation */
  pendingPageData: ExtractedData | null;
  pendingPageNumber: number | null;
  pendingPageImagePreviewUrl: string | null;
  pendingPageStoragePath: string | null;
  pendingPageTemplateId: string | null;
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
    pages: [],
    pendingHeaderConflicts: [],
    pendingPageData: null,
    pendingPageNumber: null,
    pendingPageImagePreviewUrl: null,
    pendingPageStoragePath: null,
    pendingPageTemplateId: null,
  };
}

export function generateLineId(): string {
  return Date.now().toString() + Math.random().toString(36).substring(2, 9);
}

function generatePageId(): string {
  return 'pg_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
}

/** Normalize a text string for duplicate comparison */
export function normalizeDesc(text: string): string {
  return text.trim().toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ');
}

/** Detect header conflicts between existing draft and newly-extracted data */
export function detectHeaderConflicts(
  existing: ExtractedData,
  incoming: ExtractedData,
  pageNumber: number,
): HeaderConflict[] {
  const conflicts: HeaderConflict[] = [];

  const check = (field: 'roNumber' | 'date' | 'mileage') => {
    const existVal = existing[field];
    const newVal = incoming[field];
    if (existVal && newVal && normalizeDesc(existVal) !== normalizeDesc(newVal)) {
      conflicts.push({ field, existingValue: existVal, newValue: newVal, pageNumber });
    }
  };

  check('roNumber');
  check('date');
  check('mileage');

  return conflicts;
}

/** Merge incoming page lines into draft, tagging each with sourcePage */
export function mergePageIntoSession(
  session: ScanSession,
  pageData: ExtractedData,
  pageImagePreviewUrl: string | null,
  pageStoragePath: string | null,
  templateId: string | null,
  headerOverrides?: Partial<Pick<ExtractedData, 'roNumber' | 'date' | 'mileage'>>,
): ScanSession {
  const isFirstPage = session.pages.length === 0;
  const pageNumber = session.pages.length + 1;

  const taggedLines: ExtractedLine[] = pageData.lines.map(l => ({
    ...l,
    sourcePage: pageNumber,
  }));

  let mergedData: ExtractedData;

  if (isFirstPage || !session.extractedData) {
    mergedData = {
      ...pageData,
      lines: taggedLines,
    };
  } else {
    const existing = session.extractedData;
    mergedData = {
      // Keep page-1 header fields unless explicitly overridden
      roNumber: headerOverrides?.roNumber !== undefined ? headerOverrides.roNumber : (existing.roNumber ?? pageData.roNumber),
      advisor: existing.advisor ?? pageData.advisor,
      date: headerOverrides?.date !== undefined ? headerOverrides.date : (existing.date ?? pageData.date),
      customerName: existing.customerName ?? pageData.customerName,
      mileage: headerOverrides?.mileage !== undefined ? headerOverrides.mileage : (existing.mileage ?? pageData.mileage),
      vehicleYear: existing.vehicleYear ?? pageData.vehicleYear,
      vehicleMake: existing.vehicleMake ?? pageData.vehicleMake,
      vehicleModel: existing.vehicleModel ?? pageData.vehicleModel,
      vehicleVin: existing.vehicleVin ?? pageData.vehicleVin,
      candidateDates: existing.candidateDates,
      // Append new lines at the top (most-recent page first)
      lines: [...taggedLines, ...existing.lines],
      fieldConfidence: existing.fieldConfidence,
    };
  }

  const newPage: ScanPage = {
    pageId: generatePageId(),
    pageNumber,
    imagePreviewUrl: pageImagePreviewUrl,
    storagePath: pageStoragePath,
    templateId,
    extractedData: pageData,
  };

  return {
    ...session,
    extractedData: mergedData,
    imagePreviewUrl: session.pages.length === 0 ? pageImagePreviewUrl : session.imagePreviewUrl,
    storagePath: session.pages.length === 0 ? pageStoragePath : session.storagePath,
    pages: [...session.pages, newPage],
    pendingHeaderConflicts: [],
    pendingPageData: null,
    pendingPageNumber: null,
    pendingPageImagePreviewUrl: null,
    pendingPageStoragePath: null,
    pendingPageTemplateId: null,
    errorMessage: null,
    state: 'review',
  };
}
