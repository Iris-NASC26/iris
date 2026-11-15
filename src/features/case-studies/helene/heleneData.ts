export const heleneData = {
  region: {
    west: -84.5,
    east: -81.0,
    south: 29.0,
    north: 36.5
  },

  event: {
    start: "2024-09-26",
    end: "2024-09-27"
  },

  ocean: {
    unit: "°C",
    cadence: "monthly",
    product: "MODISA_L3m_NSST_Monthly_9km_R2019_0_sst",
    observations: [
      { date: "2024-08", value: 27.7181339 },
      { date: "2024-09", value: 27.1833229 }
    ]
  },

  rainfall: {
    unit: "kg/m²",
    cadence: "monthly",
    product: "NLDAS_NOAH0125_M_2_0_Rainf",
    observations: [
      { date: "2024-08", value: 138.532867 },
      { date: "2024-09", value: 212.519058 },
      { date: "2024-10", value: 18.7252617 }
    ]
  },

  soil: {
    unit: "kg/m²",
    cadence: "daily",
    product: "GLDAS_CLSM025_DA1_D_2_2_SoilMoist_S_tavg",
    observations: [
      { date: "2024-09-25", value: 6.64522886 },
      { date: "2024-09-26", value: 7.66144991 },
      { date: "2024-09-27", value: 7.58885908 }
    ]
  },

  runoff: {
    unit: "kg/m²",
    cadence: "monthly",
    product: "GLDAS_NOAH025_M_2_1_Qs_acc",
    observations: [
      { date: "2024-08", value: 0.00969412271 },
      { date: "2024-09", value: 0.0185763612 },
      { date: "2024-10", value: 0.000836261839 }
    ]
  },

  wind: {
    unit: "m/s",
    cadence: "monthly",
    product: "M2TMNXFLX_5_12_4_SPEED",
    observations: [
      { date: "2024-09", value: 4.79129171 }
    ]
  }
} as const;
