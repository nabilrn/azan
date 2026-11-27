import { TZ, PRAYERS, $, state } from './config.js';
import { changeSource, renderClock } from './ui.js';
let onPrayerStarts = () => {
};
function setPrayerHandler(handler) {
  onPrayerStarts = handler;
}
const fmtParts=new Intl.DateTimeFormat('en-GB',{
  timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit'
});
function localDate(timestamp=Date.now()){
  const p=Object.fromEntries(fmtParts.formatToParts(new Date(timestamp)).filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));
  return `${p.year}-${p.month}-${p.day}`
}
function nextDate(date){
  return localDate(Date.parse(date+'T12:00:00+07:00')+86400000)
}
function toMs(date,time){
  return Date.parse(`${date}T${time}:00+07:00`)
}
function isHHMM(s){
  return typeof s==='string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(s)
}
function normalise(obj){
  if(!obj||typeof obj!=='object')return null;
  const d={
  };
  for(const p of PRAYERS){
    if(!isHHMM(obj[p.key]))return null;
    d[p.key]=obj[p.key]
  }return d
}
function setSchedule(date,values,source){
  const d=normalise(values);
  if(!d)return false;
  const old=state.schedules.get(date);
  if(!old||source==='Kemenag RI · Sajadah'||!old.source.includes('Sajadah')){
    state.schedules.set(date,{
      ...d,source
    });
    try{
      localStorage.setItem('ruangsalat:'+date,JSON.stringify({
        ...d,source
      }))
    }catch{
    }
  }return true
}
function useCache(date){
  if(state.schedules.has(date))return true;
  try{
    const v=JSON.parse(localStorage.getItem('ruangsalat:'+date));
    const d=v&&normalise(v);
    if(d){
      state.schedules.set(date,{
        ...d,source:'Cache lokal · '+(v.source||'jadwal tersimpan')
      });
      return true
    }
  }catch{
  }return false
}
async function fetchJson(url){
  const c=new AbortController(),timer=setTimeout(()=>c.abort(),9000);
  try{
    const res=await fetch(url,{
      signal:c.signal,cache:'no-cache'
    });
    if(!res.ok)throw Error('HTTP '+res.status);
    return await res.json()
  }finally{
    clearTimeout(timer)
  }
}
async function loadYear(year){
  if(state.yearJobs.has(year))return state.yearJobs.get(year);
  const job=(async()=>{
    const j=await fetchJson(`https://sajadah.org/api/v1/times/id/kota-jakarta/${year}.json`);
    if(j.schema!==1||j.region?.id!=='kota-jakarta'||!Array.isArray(j.fields)||!Array.isArray(j.days))throw Error('Format data Sajadah tidak valid');
    let count=0;
    for(const day of j.days){
      const o=Object.fromEntries(j.fields.map((k,i)=>[k,day[i]]));
      if(/^\d{4}-\d{2}-\d{2}$/.test(o.date)&&setSchedule(o.date,{
        subuh:o.fajr,dzuhur:o.dhuhr,ashar:o.asr,maghrib:o.maghrib,isya:o.isha
      },'Kemenag RI · Sajadah'))count++
    }if(count<300)throw Error('Data belum lengkap');
  })();
  state.yearJobs.set(year,job);
  try{
    return await job
  }catch(err){
    state.yearJobs.delete(year);
    throw err
  }
}
async function loadMonth(year,month){
  const key=year+'-'+month;
  if(state.monthJobs.has(key))return state.monthJobs.get(key);
  const job=(async()=>{
    const j=await fetchJson(`https://api.myquran.com/v2/sholat/jadwal/1301/${year}/${month}`);
    if(j.status!==true||!j.data?.jadwal)throw Error('Data myQuran tidak valid');
    const rows=Array.isArray(j.data.jadwal)?j.data.jadwal:Object.values(j.data.jadwal);
    let count=0;
    for(const o of rows){
      const date=/^\d{4}-\d{2}-\d{2}$/.test(o.tanggal)?o.tanggal:(/^\d{4}-\d{2}-\d{2}$/.test(o.date)?o.date:null);
      if(date&&setSchedule(date,{
        subuh:o.subuh,dzuhur:o.dzuhur,ashar:o.ashar,maghrib:o.maghrib,isya:o.isya
      },'Kemenag RI · myQuran'))count++
    }if(!count)throw Error('Jadwal kosong');
  })();
  state.monthJobs.set(key,job);
  try{
    return await job
  }catch(err){
    state.monthJobs.delete(key);
    throw err
  }
}
async function ensureSchedules(){
  if(state.loading)return;
  state.loading=true;
  try{
    const today=localDate(),tomorrow=nextDate(today);
    useCache(today);
    useCache(tomorrow);
    if(state.schedules.has(today)&&state.schedules.has(tomorrow))update();
    let fresh=false;
    try{
      fresh=localStorage.getItem('ruangsalat:refreshed')===today
    }catch{
    }if(fresh&&state.schedules.has(today)&&state.schedules.has(tomorrow)){
      state.retryAt=0;
      return
    }state.yearJobs.clear();
    state.monthJobs.clear();
    const years=[...new Set([Number(today.slice(0,4)),Number(tomorrow.slice(0,4))])];
    let refreshed=false;
    try{
      await Promise.all(years.map(loadYear));
      refreshed=true
    }catch(err){
      console.warn('Sajadah tidak tersedia:',err.message)
    }if(!refreshed||!state.schedules.has(today)||!state.schedules.has(tomorrow)){
      const months=[...new Set([today.slice(0,7),tomorrow.slice(0,7)])];
      const results=await Promise.allSettled(months.map(s=>loadMonth(Number(s.slice(0,4)),Number(s.slice(5,7)))));
      refreshed=refreshed||results.every(r=>r.status==='fulfilled')
    }if(refreshed&&state.schedules.has(today)&&state.schedules.has(tomorrow)){
      try{
        localStorage.setItem('ruangsalat:refreshed',today)
      }catch{
      }
    }update();
    if(!state.schedules.has(today)){
      changeSource('Jadwal gagal dimuat · cek koneksi internet',false);
      state.retryAt=Date.now()+60000
    }else state.retryAt=refreshed&&state.schedules.has(tomorrow)?0:Date.now()+60000
  }finally{
    state.loading=false
  }
}
function getTimeline(day, data){
  return PRAYERS.map(p=>({
    ...p,day,time:data[p.key],ms:toMs(day,data[p.key])
  }))
}
function update(){
  const now=Date.now(),day=localDate(now);
  renderClock(now);
  if(state.date!==day){
    state.date=day;
    const prev=state.schedules.get(day);
    if(!prev)useCache(day);
    useCache(nextDate(day));
    ensureSchedules().catch(err=>console.warn('Schedule:',err));
  }
  const today=state.schedules.get(day),tomorrow=state.schedules.get(nextDate(day));
  if(!today){
    document.documentElement.dataset.nextPrayer='';
    $('nextPrayer').textContent='—';
    $('countdown').textContent='--:--:--';
    $('nextDescription').textContent='Jadwal Kota Jakarta belum tersedia';
    state.lastTickMs=now;
    if(state.retryAt&&now>=state.retryAt){
      state.retryAt=now+60000;
      ensureSchedules().catch(()=>{
      })
    }return
  }
  changeSource('Jadwal '+today.source+' · Kota Jakarta (Jaksel) · WIB',true);
  const timeline=getTimeline(day,today);
  const upcoming=timeline.find(p=>p.ms>now)|| (tomorrow?getTimeline(nextDate(day),tomorrow)[0]:null);
  // Use the alternate photo while waiting for Ashar or Maghrib.
  const photoMode = ['ashar', 'maghrib'].includes(upcoming?.key) ? upcoming.key : '';
  if(document.documentElement.dataset.nextPrayer!==photoMode)document.documentElement.dataset.nextPrayer=photoMode;
  const latest=[...timeline].reverse().find(p=>p.ms<=now);
  state.current=latest?.key||'';
  state.next=upcoming;
  state.nextMs=upcoming?.ms||0;
  for(const p of PRAYERS){
    const el=document.querySelector(`.prayer[data-prayer="${p.key}"]`);
    el.querySelector('.prayer-time').textContent=today[p.key];
    el.classList.toggle('is-current',p.key===state.current);
    const isNext=upcoming?.day===day&&upcoming.key===p.key;
    el.classList.toggle('is-next',isNext);
    el.querySelector('.mini-tag').hidden=!isNext;
  }
  if(upcoming){
    $('nextPrayer').textContent=upcoming.name;
    $('kicker').textContent='WAKTU SALAT BERIKUTNYA';
    $('countLabel').textContent='Waktu tersisa menuju '+upcoming.name;
    $('nextDescription').textContent=upcoming.time+' WIB';
    $('nextDay').textContent=upcoming.day===day?'Hari ini':'Besok';
    let seconds=Math.max(0,Math.ceil((upcoming.ms-now)/1000));
    const hrs=Math.floor(seconds/3600);
    seconds%=3600;
    const mins=Math.floor(seconds/60),secs=seconds%60;
    $('countdown').innerHTML=`${String(hrs).padStart(2,'0')}<span class="colon">:</span>${String(mins).padStart(2,'0')}<span class="colon">:</span>${String(secs).padStart(2,'0')}`;
  }else{
    $('nextPrayer').textContent='Subuh';
    $('countdown').textContent='--:--:--';
    $('nextDescription').textContent='Menyiapkan jadwal besok';
    $('nextDay').textContent='';
    if(!tomorrow&&now>=state.retryAt&&!state.loading){
      state.retryAt=now+60000;
      ensureSchedules().catch(()=>{
      })
    }
  }
  // Only fire after we actually pass a prayer boundary while this page is open.
  // The lastTick guard prevents a newly opened page from replaying an earlier azan.
  for(const p of timeline){
    if(state.lastTickMs<p.ms && now>=p.ms && now-p.ms<120000)onPrayerStarts(p)
  }
  state.lastTickMs=now;
  if(state.retryAt&&now>=state.retryAt&&!state.loading){
    state.retryAt=now+60000;
    ensureSchedules().catch(()=>{
    })
  }
}
function storeLastFired(p){
  try{
    localStorage.setItem('ruangsalat:lastazan',p.day+'-'+p.key)
  }catch{
  }
}
function alreadyFired(p){
  try{
    return localStorage.getItem('ruangsalat:lastazan')===p.day+'-'+p.key
  }catch{
    return false
  }
}
export { localDate, ensureSchedules, update, storeLastFired, alreadyFired, setPrayerHandler };
