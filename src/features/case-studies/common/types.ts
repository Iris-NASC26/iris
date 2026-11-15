export interface DataPoint {
  date: string;
  time: string;
  val: number;
}

export interface DatasetMeta {
  product: string;
  variable: string;
  variableName: string;
  nativeUnit: string;
  displayUnit: string;
  spatialResolution: string;
  temporalResolution: string;
  userBbox: string;
  dataBbox: string;
  urlToReproduce?: string;
  verifiedObservation?: string;
  coverage: {
    start: string;
    end: string;
    count: number;
  };
  stats: {
    min: number;
    max: number;
    mean: number;
    std: number;
  };
}

export interface CaseStudyIndicator {
  variableName: string;
  product: string;
  units: string;
  temporalResolution: string;
  coverage: string;
  status: "verified" | "partial" | "missing_in_source";
  verifiedObservation: string;
  note?: string;
}

export interface CaseStudySeries {
  id: string;
  name: string;
  meta: DatasetMeta;
  data: DataPoint[];
  color?: string;
  conversion?: (val: number) => number;
  accumulationConverter?: (val: number) => { val: number; unit: string; label: string };
  isMissing?: boolean;
  missingExplanation?: string;
}

export interface CaseStudyDefinition {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  location: string;
  event: string;
  year: string;
  tag: string;
  intro: {
    background: string;
    question: string;
    contextBullets?: string[];
  };
  region: {
    locationDescription: string;
    coordinates: {
      west: number;
      east: number;
      south: number;
      north: number;
    };
    center: {
      lat: number;
      lon: number;
    };
    datasetCoverageNote: string;
  };
  indicators: CaseStudyIndicator[];
  datasets: CaseStudySeries[];
  eventAnnotation?: {
    date: string;
    label: string;
  };
  scientificFindings: {
    mainObservations: string[];
    anomaliesAndTrends: string[];
    reportExplanations: string[];
    limitations: string[];
  };
  sourcesAndMethods: {
    originalDatasets: {
      name: string;
      productId: string;
      provider: string;
      nativeUnit: string;
      coverage: string;
      spatialResolution: string;
      link?: string;
    }[];
    originalReport: {
      title: string;
      authorsOrPortal: string;
      keyCitation: string;
    };
    methodologyNotes: string[];
    limitationsStatement: string;
  };
  // Special section for dual studies like Libya / Pakistan
  subSections?: {
    id: string;
    title: string;
    subtitle: string;
    intro: string;
    indicators: CaseStudyIndicator[];
    datasets: CaseStudySeries[];
    eventAnnotation?: {
      date: string;
      label: string;
    };
    findings: string[];
    limitations: string[];
  }[];
}
