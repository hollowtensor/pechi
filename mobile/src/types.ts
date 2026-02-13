export type AppState = "idle" | "connected" | "listening" | "transcribing" | "thinking" | "result";

// ---------------------------------------------------------------------------
// Media analysis types
// ---------------------------------------------------------------------------

export interface MediaAnalysis {
  id: number;
  customer_id: number | null;
  vehicle_id: number | null;
  file_path: string;
  file_name: string;
  customer_note: string | null;
  analysis: string;
  tags: string[];
  created_at: string;
}

export interface UploadMediaResponse {
  success: boolean;
  mediaId?: number;
  fileName?: string;
  analysis?: string;
  tags?: string[];
  message?: string;
}

export type MessageRole = "user" | "agent";

export type ImageAnalysisStatus = 'uploading' | 'analyzing' | 'done' | 'error';

export interface ChatImage {
  uri: string;
  mediaId?: number;
  status: ImageAnalysisStatus;
  analysis?: string;
  tags?: string[];
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  text: string;
  time: string;
  panelId?: string;
  image?: ChatImage;
}

export interface JobCard {
  customer: {
    name: string;
    phone: string;
    customerId: number;
  };
  vehicle: {
    model: string;
    variant: string;
    registrationNo: string;
    mileage: number;
    vehicleId: number;
  };
  servicePackage: {
    id: number;
    name: string;
    price: number;
    includes: string[];
  } | null;
  serviceItems: Array<{
    name: string;
    description: string;
    cost: number;
  }>;
  parts: Array<{
    name: string;
    partNumber: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  totalEstimate: number;
  preferredDate: string;
  notes: string;
}

// ---------------------------------------------------------------------------
// Side panel types
// ---------------------------------------------------------------------------

export type SidePanelType =
  | "vehicle_info"
  | "service_history"
  | "parts_list"
  | "service_packages"
  | "job_card";

export interface VehicleInfoData {
  customer: { name: string; phone: string; email?: string };
  vehicle: {
    model: string;
    variant: string;
    fuelType: string;
    year: number;
    registrationNo: string;
    color: string;
    mileage: number;
  };
}

export interface ServiceHistoryData {
  vehicleLabel: string;
  records: Array<{
    date: string;
    type: string;
    description: string;
    cost: number;
    status: string;
    partsReplaced: string[];
    nextServiceDate?: string;
    notes?: string;
  }>;
}

export interface PartsListData {
  parts: Array<{
    name: string;
    partNumber: string;
    category: string;
    price: number;
    compatibleModels: string;
    inStock: boolean;
  }>;
}

export interface ServicePackagesData {
  packages: Array<{
    id: number;
    name: string;
    description: string;
    price: number;
    validityMonths: number;
    includes: string[];
  }>;
}

export type SidePanelContent =
  | { type: "vehicle_info"; data: VehicleInfoData }
  | { type: "service_history"; data: ServiceHistoryData }
  | { type: "parts_list"; data: PartsListData }
  | { type: "service_packages"; data: ServicePackagesData }
  | { type: "job_card"; data: JobCard };

export interface SidePanelItem {
  id: string;
  panelType: SidePanelType;
  title: string;
  content: SidePanelContent;
  isActionable: boolean;
  isExpanded: boolean;
}

// ---------------------------------------------------------------------------
// Job card execution types
// ---------------------------------------------------------------------------

export type JobCardStatus =
  | 'confirmed'
  | 'received'
  | 'diagnosis'
  | 'in_progress'
  | 'quality_check'
  | 'ready_for_delivery'
  | 'completed';

export const JOB_CARD_STATUS_ORDER: JobCardStatus[] = [
  'confirmed',
  'received',
  'diagnosis',
  'in_progress',
  'quality_check',
  'ready_for_delivery',
  'completed',
];

export const JOB_CARD_STATUS_LABELS: Record<JobCardStatus, string> = {
  confirmed: 'Confirmed',
  received: 'Received',
  diagnosis: 'Diagnosis',
  in_progress: 'In Progress',
  quality_check: 'Quality Check',
  ready_for_delivery: 'Ready',
  completed: 'Completed',
};

export interface StatusHistoryEntry {
  status: JobCardStatus;
  timestamp: string;
  notes: string;
}

export interface ChecklistItem {
  key: string;
  label: string;
  category: 'service' | 'part';
  checked: boolean;
  checked_at: string | null;
}

export interface JobCardListItem {
  id: number;
  customer_name: string;
  customer_phone: string;
  vehicle_model: string;
  vehicle_variant: string;
  registration_no: string;
  mileage: number;
  status: JobCardStatus;
  preferred_date: string;
  total_estimate: number;
  actual_cost: number | null;
  assigned_technician: string | null;
  notes: string;
  service_items: Array<{
    name: string;
    description: string;
    cost: number;
  }>;
  parts: Array<{
    name: string;
    partNumber: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  status_history: StatusHistoryEntry[];
  checklist: ChecklistItem[];
  advisor_remarks: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}
