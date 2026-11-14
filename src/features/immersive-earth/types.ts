export type ImmersiveMode = "explore" | "layers" | "time" | "compare" | "evidence";

export type DataStatus = "live" | "verified_snapshot" | "simulated_demo" | "unavailable";

export interface DemoScene {
  id: string;
  locationName: string;
  country: string;
  latitude: number;
  longitude: number;
  variable: string;
  variableCode: string;
  unit: string;
  currentValue: number;
  baselineDiff: string;
  insight: string;
  sourceStatus: "verified_snapshot" | "simulated_demo";
  sourceName: string;
  sourceUrl?: string;
  timeSeries: Array<{
    date: string;
    value: number;
  }>;
}

export interface LayerItem {
  id: string;
  name: string;
  category: "basemap" | "raster" | "vector";
  description: string;
  visible: boolean;
  opacity: number;
  available: boolean;
  badge?: string;
}

export interface ImmersiveEarthState {
  activeMode: ImmersiveMode;
  selectedLocationId: string;
  comparisonLocationId: string | null;
  selectedVariable: string;
  selectedDate: string;
  isPlaying: boolean;
  isAutoRotating: boolean;
  layers: LayerItem[];
  isLocationPanelOpen: boolean;
  isNavigationOpen: boolean;
  isOverflowOpen: boolean;
  dataStatus: DataStatus;
}
