import type {
  DataProduct,
  DiscoveryResponse,
} from "@/lib/dataRetrievalEngine";
import { EMPTY_DISCOVERY_STATE } from "@/lib/dataRetrievalEngine";

export const DEVELOPMENT_DEMO_PREFIX = "DEMO_";

export function isDevelopmentDemoProduct(_productId: string) {
  return false;
}

export const DEVELOPMENT_DEMO_BBOX: [number, number, number, number] = [
  85.0, 28.0, 85.8, 28.6,
];

export const DEVELOPMENT_DEMO_PRODUCTS: DataProduct[] = [];

export const DEVELOPMENT_DEMO_DISCOVERY: DiscoveryResponse = EMPTY_DISCOVERY_STATE;
