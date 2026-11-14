import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calendar, color, coordinates, histogram, lineData, monthlyCells, paired, parseField, parsePreview, rows, scale, standardize, summary, timestamp, type Datum } from '../../src/features/visualization/model.ts';
import { location, vector } from '../../src/features/visualization/globeMath.ts';

// TEST-ONLY synthetic transport fixtures; never imported by application code.
const datum=(date:string,value:number|null,qa='Valid'):Datum=>({timestamp:date,time:timestamp(date),value,qa:qa as Datum['qa']});
const preview=()=>({job_id:'test-job',status:'completed',upstream_live_fetched:true,total_rows:3,
 product:{product_id:'test-only',variable_id:'T2M',source_api:'TEST',variable_name:'Test variable'},
 extraction_config:{variable_id:'T2M',spatial_Submode:'point',point_lat:6,point_lon:80,region_name:'Test point',target_frequency:'Monthly'},
 summary_stats:{unit:'C'},chart_series:[{timestamp:'2020-01',value:0,unit:'C',variable_id:'T2M',qa_flag:'Valid'},{timestamp:'2020-02',value:null,unit:'C',variable_id:'T2M',qa_flag:'Missing'},{timestamp:'2020-04',value:-2,unit:'C',variable_id:'T2M',qa_flag:'Flagged'}]});

describe('source admission and calendar handling',()=>{
 it('retains zero, negative values and explicit missing values without coercion',()=>{const p=parsePreview(preview());assert.equal(rows(p)[0].value,0);assert.equal(rows(p)[2].value,null);assert.equal(rows(p,'','',true)[2].value,-2);});
 for(const bad of ['2020-02-30','2020-13','not-a-date','2020-01-01T10:00:00'])it(`rejects malformed/ambiguous timestamp ${bad}`,()=>assert.throws(()=>timestamp(bad)));
 it('accepts leap days and uses UTC',()=>{assert.equal(timestamp('2020-02-29'),Date.UTC(2020,1,29));assert.equal(timestamp('2020-01'),Date.UTC(2020,0,1));});
 it('rejects duplicate timestamps instead of averaging them',()=>{const p=preview();p.chart_series[1].timestamp='2020-01';assert.throws(()=>parsePreview(p),/Duplicate/);});
 it('rejects partial series, conflicting units, non-finite values and fake snapshots',()=>{
  const a=preview();a.total_rows=4;assert.throws(()=>parsePreview(a),/incomplete/);
  const b=preview();b.chart_series[0].unit='K';assert.throws(()=>parsePreview(b),/units/);
  const c=preview();c.chart_series[0].value=Infinity;assert.throws(()=>parsePreview(c),/values/);
  const d=preview();d.upstream_live_fetched=false;assert.throws(()=>parsePreview(d),/live extraction/);
 });
 it('inserts only a null display break for an omitted month',()=>{const data=[datum('2020-01',1),datum('2020-03',3)];const result=lineData(data,'Monthly');assert.deepEqual(result,[[timestamp('2020-01'),1],[timestamp('2020-01')+1,null],[timestamp('2020-03'),3]]);assert.equal(data.length,2);});
 it('does not invent a gap between adjacent months of unequal duration',()=>assert.equal(lineData([datum('2020-02',1),datum('2020-03',2)],'Monthly').length,2));
 it('does not replace a regional footprint with a false exact-point claim',()=>{const p=parsePreview(preview());p.extraction_config.spatial_Submode='bbox';p.extraction_config.bbox=[10,20,30,40];assert.deepEqual(coordinates(p),{lat:30,lon:20,representative:true});});
});

describe('descriptive calculations against hand-computed references',()=>{
 const data=[datum('2020-01',1),datum('2020-02',null),datum('2021-01',3),datum('2021-02',5)];
 it('reports only observed count, mean, range and endpoint difference',()=>{const s=summary(data);assert.equal(s.count,3);assert.equal(s.missing,1);assert.equal(s.mean,3);assert.equal(s.change,4);assert.equal(s.min,1);assert.equal(s.max,5);});
 it('never substitutes zeros when all values are missing',()=>{const s=summary([datum('2020-01',null)]);assert.equal(s.mean,null);assert.equal(s.change,null);});
 it('computes calendar means from available observations',()=>{const c=calendar(data);assert.deepEqual(c[0],{month:0,count:2,mean:2});assert.deepEqual(c[1],{month:1,count:1,mean:5});assert.equal(c[2].mean,null);});
 it('computes month-relative departures and leaves absent cells absent',()=>{const c=monthlyCells(data);assert.equal(c.length,3);assert.equal(c[0].anomaly,-1);assert.equal(c[1].anomaly,1);assert.equal(c[2].anomaly,0);});
 it('uses sample standard deviation and does not change original values',()=>{const c=standardize(data);assert.deepEqual(c.map(r=>r.value),[-1,null,0,1]);assert.equal(data[0].value,1);});
 it('handles a constant series without NaN or false significance',()=>{const c=standardize([datum('2020-01',8),datum('2020-02',8)]);assert.deepEqual(c.map(r=>r.value),[0,0]);assert.equal(histogram(c)[0].count,2);});
 it('assigns every observation to exactly one histogram bin',()=>assert.equal(histogram(data).reduce((n,b)=>n+b.count,0),3));
 it('pairs exact timestamps without interpolation or positional alignment',()=>{const other=[datum('2020-02',9),datum('2021-01',10)];assert.deepEqual(paired(data,other),[[3,10,'2021-01']]);});
 it('has a non-degenerate scale for constant or empty fields',()=>{assert.deepEqual(scale([null]),[0,1]);assert.deepEqual(scale([5,5]),[4.5,5.5]);assert.deepEqual(scale([-2,1],true),[-2,2]);assert.equal(color(1,[0,1]),'#f6df76');});
});

describe('globe coordinate and field validation',()=>{
 for(const [lat,lon] of [[0,0],[90,0],[-45,80],[12,-179.9]])it(`round trips ${lat},${lon} without reversed longitude`,()=>{const [x,y,z]=vector(lat,lon);const result=location(x,y,z);assert.ok(Math.abs(result.lat-lat)<1e-8);assert.ok(Math.abs(result.lon-lon)<1e-8);});
 const field=()=>({schema_version:'visualization.field.v1',variable_id:'V01',month:'2024-01',field:'T2M',units:'C',cell_lats:[0,0.5],cell_lons:[10,10.625],lat_step:0.5,lon_step:0.625,values:[0,null,-2,3],source:{scientifically_validated:false,artifact_sha256:{test:'a'.repeat(64)}}});
 it('retains row-major grid ordering, zero and missing values',()=>assert.deepEqual(parseField(field()).values,[0,null,-2,3]));
 it('rejects transposed/incomplete arrays and descending coordinates',()=>{const f=field();f.values.pop();assert.throws(()=>parseField(f));const g=field();g.cell_lats.reverse();assert.throws(()=>parseField(g));});
});
