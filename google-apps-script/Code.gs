/**
 * TABE PALU API — Google Apps Script
 * Spreadsheet-bound script.
 * Script Properties required: API_SECRET = same secret as Cloudflare Pages env TABE_API_SECRET.
 */
const SHEET_NAME = 'DATA_KUNJUNGAN';
const ATTRACTIONS_SHEET = 'OBJEK_WISATA';
const HEADERS = [
  'ID Kunjungan','Tanggal Kunjungan','Jam Kunjungan (WITA)','Nama Lengkap','Usia',
  'Jenis Kelamin','Kategori Asal','Kabupaten/Kota Asal','Provinsi Asal','Negara Asal',
  'Objek Wisata','Apakah Menginap','Jenis Akomodasi','Keterangan Akomodasi Lainnya',
  'Lama Menginap (Malam)','Kategori Jumlah Rombongan','Jumlah Orang Sebenarnya','Status Penyimpanan'
];
const ATTRACTION_HEADERS = ['id','name','category','active'];

function doGet(e) {
  try {
    requireSecret_(e && e.parameter && e.parameter.secret);
    const action = String((e && e.parameter && e.parameter.action) || '');
    if (action === 'list') return json_({result:'success', sheet:SHEET_NAME, data:listVisits_()});
    if (action === 'listAttractions') return json_({result:'success', sheet:ATTRACTIONS_SHEET, data:listAttractions_()});
    return json_({result:'error', message:'Aksi GET tidak dikenal.'});
  } catch (err) {
    return json_({result:'error', message:String(err.message || err)});
  }
}

function doPost(e) {
  try {
    const body = JSON.parse(e && e.postData && e.postData.contents || '{}');
    requireSecret_(body.secret);
    if (body.action === 'saveAttractions') {
      const incoming = body.attractions;
      if (!Array.isArray(incoming) || incoming.length > 300) throw new Error('Format/jumlah objek wisata tidak valid.');
      const clean = incoming.map(a => ({
        id:String(a && a.id || '').trim(),
        name:String(a && a.name || '').trim(),
        category:String(a && a.category || '').trim(),
        active:a && a.active === false ? 'false' : 'true'
      }));
      if (clean.some(a => !a.id || !a.name)) throw new Error('Setiap objek wisata wajib memiliki ID dan nama.');
      if (new Set(clean.map(a=>a.id)).size !== clean.length) throw new Error('ID objek wisata duplikat.');
      const sh = getAttractionsSheet_();
      sh.clearContents();
      sh.getRange(1,1,1,4).setValues([ATTRACTION_HEADERS]);
      if (clean.length) sh.getRange(2,1,clean.length,4).setValues(clean.map(a=>[a.id,a.name,a.category,a.active]));
      sh.setFrozenRows(1);
      return json_({result:'success', message:'Daftar objek wisata berhasil disimpan.', count:clean.length});
    }
    if (body.action === 'saveVisit') {
      const d = body.visit || {};
      if (!d.id_kunjungan) throw new Error('ID kunjungan wajib diisi.');
      const sh = getVisitSheet_();
      const last = sh.getLastRow();
      if (last >= 2) {
        const ids = sh.getRange(2,1,last-1,1).getDisplayValues().flat();
        if (ids.includes(String(d.id_kunjungan))) return json_({result:'success', duplicate:true, id_kunjungan:d.id_kunjungan});
      }
      const row = [
        d.id_kunjungan,d.tanggal_kunjungan,d.jam_kunjungan,d.nama_lengkap,d.usia,d.jenis_kelamin,
        d.kategori_asal,d.kabupaten_sulteng,d.provinsi_asal,d.negara_asal,d.objek_wisata,d.menginap,
        d.jenis_akomodasi,d.keterangan_akomodasi,d.lama_menginap,d.jumlah_rombongan_kategori,
        d.jumlah_orang_sebenarnya,'Tersimpan (Google Sheets)'
      ].map(safe_);
      sh.appendRow(row);
      return json_({result:'success', id_kunjungan:d.id_kunjungan});
    }
    throw new Error('Aksi POST tidak dikenal.');
  } catch (err) {
    return json_({result:'error', message:String(err.message || err)});
  }
}

function requireSecret_(provided) {
  const expected = PropertiesService.getScriptProperties().getProperty('API_SECRET');
  if (!expected) throw new Error('Script Property API_SECRET belum diatur.');
  if (!provided || String(provided) !== expected) throw new Error('API secret tidak valid.');
}
function listVisits_() {
  const sh = getVisitSheet_(), values = sh.getDataRange().getDisplayValues();
  const headers = values[0] || HEADERS;
  return values.slice(1).filter(r=>r.some(c=>c!=='')).map(r=>{
    const o={}; headers.forEach((h,i)=>o[h]=r[i]||''); return o;
  });
}
function listAttractions_() {
  const sh=getAttractionsSheet_(), last=sh.getLastRow();
  const rows=last>1?sh.getRange(2,1,last-1,4).getDisplayValues():[];
  return rows.filter(r=>r[0]&&r[1]).map(r=>({id:r[0],name:r[1],category:r[2]||'',active:String(r[3]).toLowerCase()!=='false'}));
}
function getVisitSheet_() {
  const ss=SpreadsheetApp.getActiveSpreadsheet();
  if(!ss) throw new Error('Apps Script harus terikat pada Google Spreadsheet database.');
  let sh=ss.getSheetByName(SHEET_NAME);
  if(!sh) sh=ss.insertSheet(SHEET_NAME);
  if(sh.getLastRow()===0){sh.getRange(1,1,1,HEADERS.length).setValues([HEADERS]);sh.setFrozenRows(1);}
  return sh;
}
function getAttractionsSheet_() {
  const ss=SpreadsheetApp.getActiveSpreadsheet();
  if(!ss) throw new Error('Apps Script harus terikat pada Google Spreadsheet database.');
  let sh=ss.getSheetByName(ATTRACTIONS_SHEET);
  if(!sh) sh=ss.insertSheet(ATTRACTIONS_SHEET);
  if(sh.getLastRow()===0){
    sh.getRange(1,1,1,4).setValues([ATTRACTION_HEADERS]); sh.setFrozenRows(1);
    const seed=[['1','Taipa Beach','Wisata Tirta','true'],['2','Gong Perdamaian (Nosarara Nosabatutu)','Wisata Sejarah / Monumen','true'],['3','Millenium Water Park','Wisata Tirta','true'],['4','Graha Tirta','Wisata Tirta','true'],['5','CitraLand','Taman Rekreasi','true'],['6','Paluabara','Wisata Tirta','true'],['7','Kolam Pemancingan 3D','Wisata Rekreasi','true'],['8','Salena (Bukit Salena)','Wisata Alam','true']];
    sh.getRange(2,1,seed.length,4).setValues(seed);
  }
  return sh;
}
function safe_(v) {
  if(v===null||v===undefined||v==='') return '-';
  const s=String(v); return /^[=+\-@]/.test(s)?"'"+s:s;
}
function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
