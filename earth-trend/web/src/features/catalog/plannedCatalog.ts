/** Presentation copy from approved SRS §5.2 / TDD §3.1, not the D01 admitted registry.
 * No availability dates, source arrays, QA policy or verified bindings are inferred here.
 */
import type { components } from '../../contracts/generated';

export interface PlannedVariable {
  id: components['schemas']['Series']['variable_id'];
  name: string;
  theme: 'Heat' | 'Water' | 'Snow and Ice' | 'Air' | 'Ocean' | 'Land and Life' | 'Sun and Clouds';
  product: string;
  field: string;
  units: components['schemas']['DatasetBinding']['units'];
  summary: string;
  definition: string;
  caution: string;
  regionalOnly?: boolean;
}

export const plannedCatalog: readonly PlannedVariable[] = [
  { id: 'V01', name: 'Air temperature near the ground', theme: 'Heat', product: 'NASA POWER · MERRA-2 monthly UTC Zarr', field: 'T2M', units: '°C',
    summary: 'How is the air around us changing?', definition: 'Monthly air temperature at two metres above the surface, from the MERRA-2 reanalysis via NASA POWER.', caution: 'This selected POWER binding is already in Celsius. Reanalysis is a model informed by observations.' },
  { id: 'V02', name: 'Rain and snow · climate record', theme: 'Water', product: 'GPCPMON 3.3', field: 'sat_gauge_precip', units: 'mm/day',
    summary: 'Follow the long-term pattern of precipitation.', definition: 'Monthly precipitation from the GPCP climate product, expressed as a mean daily rate.', caution: 'The F05 source header resolves the expected field name to sat_gauge_precip. This is separate from IMERG.' },
  { id: 'V03', name: 'Rain and snow · high resolution', theme: 'Water', product: 'GPM_3IMERGM V07 Final', field: 'Grid/precipitation', units: 'mm/day',
    summary: 'Explore rainfall at a finer spatial scale.', definition: 'IMERG monthly precipitation combines multiple satellite measurements. Finer resolution does not guarantee greater climate consistency.', caution: 'Native mm/hr requires a verified conversion to mm/day. Never splice this series with GPCP.' },
  { id: 'V04', name: 'Surface soil moisture', theme: 'Land and Life', product: 'GLDAS_NOAH025_M 2.1', field: 'SoilMoi0_10cm_inst', units: 'mm',
    summary: 'How much water is in the top layer of soil?', definition: 'Modelled water stored in the upper ten centimetres of soil, expressed as equivalent water depth.', caution: 'Native kg/m² is equivalent to mm of water. Land masks and monthly area coverage are required.' },
  { id: 'V05', name: 'Water evaporating from land and plants', theme: 'Water', product: 'GLDAS_NOAH025_M 2.1', field: 'Evap_tavg', units: 'mm/day',
    summary: 'Trace water moving from the land into the air.', definition: 'Evapotranspiration combines evaporation and water released by plants, represented as a monthly mean rate.', caution: 'The native kg/m²/s rate requires conversion to mm/day. Keep temporal support and valid-area denominators.' },
  { id: 'V06', name: 'Surface runoff', theme: 'Water', product: 'GLDAS_NOAH025_M 2.1', field: 'Qs_acc', units: 'mm/day',
    summary: 'Investigate water running across the land.', definition: 'Modelled surface runoff is a stand-in for water leaving a land surface, not a direct river-flow measurement.', caution: 'The monthly mean three-hour accumulated quantity requires the reviewed ×8 daily conversion, not ×86,400.' },
  { id: 'V07', name: 'Water stored in snow', theme: 'Snow and Ice', product: 'GLDAS_NOAH025_M 2.1', field: 'SWE_inst', units: 'mm',
    summary: 'How much water would the snow release?', definition: 'Snow water equivalent represents the depth of water stored in a snowpack, rather than the physical depth of snow.', caution: 'Native kg/m² is equivalent to mm of water. A zero snow value and a missing observation are different.' },
  { id: 'V08', name: 'Water vapour in the air', theme: 'Air', product: 'AIRS3STM 7.0 · AIRS only', field: 'TotH2OVap_A', units: 'mm',
    summary: 'Follow moisture through the atmosphere.', definition: 'Total atmospheric-column water vapour for the selected ascending AIRS branch, expressed as equivalent water depth.', caution: 'Ascending and descending branches remain separate. Clear-sky coverage and QA support must be established.' },
  { id: 'V09', name: 'Nitrogen dioxide in the lower atmosphere', theme: 'Air', product: 'OMNO2d 003', field: 'ColumnAmountNO2TropCloudScreened', units: '10^15 molecules/cm²',
    summary: 'Explore a satellite indicator of air pollution.', definition: 'A cloud-screened tropospheric nitrogen-dioxide column from OMI, not a measurement of pollution at street level.', caution: 'Daily samples require QA-aware monthly processing. Source molecules/cm² must be scaled exactly once.' },
  { id: 'V10', name: 'Haze and smoke', theme: 'Air', product: 'M2TMNXAER 5.12.4 · MERRA-2', field: 'TOTEXTTAU', units: 'dimensionless',
    summary: 'Investigate particles that affect light in the air.', definition: 'Aerosol optical depth describes how particles attenuate light through an atmospheric column. It does not identify a cause by itself.', caution: 'Retain the native 0.5° × 0.625° support. The hourly Giovanni product is a separate binding.' },
  { id: 'V11', name: 'Ocean chlorophyll-a', theme: 'Ocean', product: 'MODIS-Aqua L3 mapped CHL R2022.0', field: 'chlor_a', units: 'mg/m³',
    summary: 'Look for changes in ocean greenness.', definition: 'Satellite-derived chlorophyll-a is an indicator associated with phytoplankton. Coastal retrievals need special care.', caution: 'Keep MODIS and SeaWiFS separate. Aggregate raw concentrations before the specified log analysis.' },
  { id: 'V12', name: 'Sunlight reaching the ground', theme: 'Sun and Clouds', product: 'NASA POWER · SYN1deg monthly LST Zarr', field: 'ALLSKY_SFC_SW_DWN', units: 'W/m²',
    summary: 'How is the sunlight reaching Earth’s surface changing?', definition: 'All-sky surface downward shortwave radiation from the selected SYN1deg source, including the effect of clouds.', caution: 'This binding already uses W/m². Preserve local-solar-time labels; do not append a different solar product.' },
  { id: 'V13', name: 'Vegetation greenness', theme: 'Land and Life', product: 'MOD13A3.061 · AppEEARS', field: '_1_km_monthly_NDVI', units: 'dimensionless', regionalOnly: true,
    summary: 'Follow the seasonal greenness of vegetation.', definition: 'Monthly Terra MODIS NDVI is a greenness index. The approved scope is regional series for at least two presets.', caution: 'Raw NDVI scale is 0.0001; exported CSV may already be scaled. Cloud/snow QA and area weights must be applied.' },
];

export function findPlannedVariable(id: string | null): PlannedVariable | undefined {
  return plannedCatalog.find(item => item.id === id);
}
