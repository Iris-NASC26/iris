export type ScientificScene =
  | "ocean"
  | "rainfall"
  | "soil"
  | "runoff"
  | "wind";

export interface HeleneInteractionState {
  activeScene: ScientificScene;

  selectedTimelineStop: number;
  timelinePlaying: boolean;
  playbackSpeed: 0.5 | 1 | 2;

  selectedOceanMonth: string;
  selectedRainfallMonth: string;
  selectedRunoffMonth: string;

  soilDateA: string;
  soilDateB: string;

  comparisonA: ScientificScene;
  comparisonB: ScientificScene;

  activeQuestion: number;
  responses: Record<number, string>;
}

export interface ObservationPoint {
  date: string;
  value: number;
}

export interface SectionMeta {
  id: string;
  number: string;
  title: string;
  shortLabel: string;
}

export interface TimelineStop {
  id: number;
  label: string;
  sublabel: string;
  dateKey: string;
  type: "monthly" | "daily";
  narrative: string;
}
