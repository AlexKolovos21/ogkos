export type PlotSystem = "detached" | "continuous";
export type RoofType = "flat" | "pitched";
export type MassingStrategy = "coverage" | "height";
export type FacadeId = "cream" | "white" | "ochre" | "sand" | "gray";
export type ViewMode = "iso" | "front" | "side" | "top";
export type RoomKind = "living" | "kitchen" | "bed" | "bath" | "shop" | "storage";
export type RampSide = "left" | "right";

export type ExtraRoom = {
  kind: RoomKind;
  width: number;
  depth: number;
};

export type FloorProgram = {
  count: number;
  areas: number[];
  bedrooms?: number[];
  extras?: ExtraRoom[][];
};

export type ProjectInputs = {
  plotWidth: number;
  plotDepth: number;
  far: number;
  coverage: number;
  maxHeight: number;
  floorHeight: number;
  system: PlotSystem;
  frontSetback: number;
  sideSetback: number;
  rearSetback: number;
  pilotis: boolean;
  basement: boolean;
  basementLevels: number;
  semiBasement: boolean;
  garageDoor: boolean;
  rampSide: RampSide;
  basementStorage: boolean;
  basementHeight: number;
  parkingTarget: number;
  balconyDepth: number;
  roofType: RoofType;
  aptsPerFloor: number;
  floorPrograms: Record<string, FloorProgram>;
  massing: MassingStrategy;
  facade: FacadeId;
  costPerM2: number;
};

export type MassKind =
  | "basement"
  | "pilotis"
  | "commercial"
  | "typical"
  | "recessed"
  | "core";

export type Mass = {
  id: string;
  kind: MassKind;
  width: number;
  depth: number;
  height: number;
  x: number;
  y: number;
  z: number;
  floorIndex: number;
};

export type Room = {
  kind: RoomKind;
  label: string;
  x: number;
  z: number;
  width: number;
  depth: number;
};

export type WallSeg = {
  x: number;
  z: number;
  width: number;
  depth: number;
};

export type Apartment = {
  id: string;
  label: string;
  floorIndex: number;
  floorName: string;
  area: number;
  targetArea: number;
  bedrooms: number;
  x: number;
  y: number;
  z: number;
  width: number;
  depth: number;
  color: string;
  rooms: Room[];
  walls: WallSeg[];
};

export type FloorInfo = {
  index: number;
  habIndex: number;
  name: string;
  kind: MassKind;
  y: number;
  height: number;
  width: number;
  depth: number;
  x: number;
  z: number;
  netArea: number;
  units: Apartment[];
  walls: WallSeg[];
};

export type SavedStudy = {
  id: string;
  name: string;
  savedAt: number;
  inputs: ProjectInputs;
  address?: string;
};

export type MassingResult = {
  plotArea: number;
  allowedFloorArea: number;
  allowedCoverage: number;
  usedFloorArea: number;
  usedCoverage: number;
  unusedFar: number;
  unusedHeight: number;
  footprintWidth: number;
  footprintDepth: number;
  buildingX: number;
  buildingZ: number;
  habitableFloors: number;
  totalHeight: number;
  apartments: number;
  avgAptSize: number;
  parkingSpaces: number;
  parkingCapacity: number;
  rampGrade: number;
  greenArea: number;
  buildableWidth: number;
  buildableDepth: number;
  masses: Mass[];
  floors: FloorInfo[];
  units: Apartment[];
  farRatio: number;
  coverageRatio: number;
  heightRatio: number;
  estimatedCost: number;
  cost: import("./cost.ts").CostBreakdown;
  warnings: string[];
  hasRecessed: boolean;
  groundKind: MassKind;
};

export const FACADE_COLORS: Record<FacadeId, string> = {
  cream: "#e8dcc8",
  white: "#f3efe6",
  ochre: "#d7c09a",
  sand: "#cbb89a",
  gray: "#c8c4bc",
};

export const UNIT_COLORS = ["#c4a574", "#7e9278", "#6e8498", "#b08978"] as const;

export const ROOM_LABELS: Record<RoomKind, string> = {
  living: "Σαλόνι",
  kitchen: "Κουζίνα",
  bed: "Υπνοδ.",
  bath: "Μπάνιο",
  shop: "Κατάστημα",
  storage: "Αποθήκη",
};
