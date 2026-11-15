import fs from 'node:fs';
import path from 'node:path';

function parseGiovanniCsv(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);
  
  const meta = {};
  let headerIndex = -1;
  for (let i = 0; i < Math.min(30, lines.length); i++) {
    const line = lines[i];
    if (line.startsWith('time,')) {
      headerIndex = i;
      break;
    }
    const colonIdx = line.indexOf(':,');
    if (colonIdx !== -1) {
      const k = line.slice(0, colonIdx).trim();
      let v = line.slice(colonIdx + 2).trim();
      if (v.startsWith('"') && v.endsWith('"')) {
        v = v.slice(1, -1);
      }
      meta[k] = v;
    }
  }

  if (headerIndex === -1) {
    throw new Error(`Could not find header line in ${filePath}`);
  }

  const header = lines[headerIndex].split(',').map(s => s.trim());
  const varCol = header[1];
  
  const data = [];
  for (let i = headerIndex + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith('#')) continue;
    const parts = line.split(',');
    if (parts.length < 2) continue;
    const timeStr = parts[0].trim();
    const valStr = parts[1].trim();
    const val = parseFloat(valStr);
    if (isNaN(val) || val <= -9990 || val > 1e12) continue; // remove fill values
    data.push({
      date: timeStr.split(' ')[0],
      time: timeStr,
      val: val
    });
  }

  const vals = data.map(d => d.val);
  const min = vals.length ? Math.min(...vals) : 0;
  const max = vals.length ? Math.max(...vals) : 0;
  const sum = vals.reduce((a, b) => a + b, 0);
  const mean = vals.length ? sum / vals.length : 0;
  const variance = vals.length ? vals.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / vals.length : 0;
  const std = Math.sqrt(variance);

  return {
    meta,
    varCol,
    count: data.length,
    startDate: data.length ? data[0].date : null,
    endDate: data.length ? data[data.length - 1].date : null,
    stats: { min, max, mean, std },
    series: data
  };
}

const base = 'C:\\Users\\Administrator\\Downloads\\Nasa Space Apps';

const inputDatasets = {
  // Case 01: Nepal
  nepal_gpm_precip: path.join(base, 'Case 01 - Nepal Disaster', 'nepal', 'g4.areaAvgTimeSeries.GPM_3IMERGM_07_precipitation.20200101-20261130.85E_28N_85E_28N.csv'),
  nepal_gldas_soil: path.join(base, 'Case 01 - Nepal Disaster', 'nepal', 'g4.areaAvgTimeSeries.GLDAS_NOAH025_M_2_0_SoilMoi100_200cm_inst.20131201-20261130.85E_28N_85E_28N.csv'),

  // Case 02: Ditwah
  ditwah_rain: path.join(base, 'Case 02 - Ditwah', 'DItwah', 'g4.areaAvgTimeSeries.GLDAS_NOAH025_M_2_1_Rainf_tavg.20141101-20261130.79E_5N_81E_9N.csv'),
  ditwah_soil: path.join(base, 'Case 02 - Ditwah', 'DItwah', 'g4.areaAvgTimeSeries.GLDAS_NOAH025_M_2_1_SoilMoi40_100cm_inst.20141101-20261130.79E_5N_81E_9N.csv'),
  ditwah_runoff: path.join(base, 'Case 02 - Ditwah', 'DItwah', 'g4.areaAvgTimeSeries.GLDAS_NOAH025_M_2_1_Qs_acc.20141101-20261130.79E_5N_81E_9N.csv'),
  ditwah_wind: path.join(base, 'Case 02 - Ditwah', 'DItwah', 'g4.areaAvgTimeSeries.GLDAS_NOAH025_M_2_1_Wind_f_inst.20141101-20261130.79E_5N_81E_9N.csv'),

  // Case 03: Saudi Arabia
  saudi_temp: path.join(base, 'Case 03 - Saudi Arabia', 'saudi arabia', 'g4.areaAvgTimeSeries.AIRS3STM_7_0_SurfAirTemp_A.20040101-20261130.39E_20N_41E_22N.csv'),

  // Case 04: Libya & Pakistan (CSVs situated in Nepal subfolder)
  libya_gpm_daily_precip: path.join(base, 'Case 01 - Nepal Disaster', 'nepal', 'g4.areaAvgTimeSeries.GPM_3IMERGDF_07_precipitation.20040101-20261130.21E_32N_23E_33N.csv'),
  pakistan_gldas_soil: path.join(base, 'Case 01 - Nepal Disaster', 'nepal', 'g4.areaAvgTimeSeries.GLDAS_NOAH10_M_2_1_SoilMoi0_10cm_inst.20040101-20261130.66E_23N_70E_28N.csv')
};

console.log('Ingesting datasets...');
const results = {};
for (const [key, filePath] of Object.entries(inputDatasets)) {
  if (!fs.existsSync(filePath)) {
    console.error(`File missing: ${filePath}`);
    continue;
  }
  const parsed = parseGiovanniCsv(filePath);
  console.log(`Ingested ${key}: ${parsed.count} points (${parsed.startDate} to ${parsed.endDate})`);
  results[key] = parsed;
}

// Ensure destination directories exist
const outDir = path.join(process.cwd(), 'src', 'features', 'case-studies', 'data');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

fs.writeFileSync(path.join(outDir, 'ingestedDatasets.json'), JSON.stringify(results, null, 2));
console.log('Saved src/features/case-studies/data/ingestedDatasets.json');
