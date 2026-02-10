export type AppState = "idle" | "connected" | "listening" | "transcribing" | "thinking" | "result";

export type MessageRole = "user" | "agent";

export interface ChatMessage {
  role: MessageRole;
  text: string;
  time: string;
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
