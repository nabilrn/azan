import { TZ, $ } from './config.js';
let overlayTimer;
const silentAzanMs = 180000;
const fmtTime=new Intl.DateTimeFormat('en-GB',{
  timeZone:TZ,hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'
});
const fmtDate=new Intl.DateTimeFormat('id-ID',{
  timeZone:TZ,weekday:'long',day:'numeric',month:'long',year:'numeric'
});
const toastEl=$('toast');
let toastTimer;
function toast(msg){
  toastEl.textContent=msg;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>toastEl.classList.remove('show'),3600)
}
function changeSource(text,ok){
  $('sourceText').textContent=text;
  $('sourceDot').classList.toggle('error',!ok)
}
function renderClock(now){
  $('clock').textContent=fmtTime.format(new Date(now));
  $('dateLabel').textContent=fmtDate.format(new Date(now))
}
function showOverlay(name,isDemo,time=''){
  clearTimeout(overlayTimer);
  $('azanName').textContent=name;
  $('azanKicker').textContent=isDemo?'PRATINJAU SUARA AZAN':'TELAH TIBA WAKTU SALAT';
  $('azanTime').textContent=time?time+' WIB':'';
  $('azanTime').hidden=!time;
  $('stopAzanBtn').textContent='Hentikan azan';
  document.documentElement.dataset.azanActive = 'true';
  $('azanOverlay').classList.add('visible');
  $('azanOverlay').setAttribute('aria-hidden','false');
  $('app').inert=true;
  $('stopAzanBtn').focus({
    preventScroll:true
  })
}
function keepSilentOverlay(onClose){
  $('stopAzanBtn').textContent='Tutup pemberitahuan';
  clearTimeout(overlayTimer);
  overlayTimer=setTimeout(onClose,silentAzanMs)
}
function hideOverlay(){
  clearTimeout(overlayTimer);
  const wasVisible=$('azanOverlay').classList.contains('visible');
  $('app').inert=false;
  if(wasVisible)$('soundBtn').focus({
    preventScroll:true
  });
  $('azanOverlay').classList.remove('visible');
  delete document.documentElement.dataset.azanActive;
  $('azanOverlay').setAttribute('aria-hidden','true')
}
export { toast, changeSource, renderClock, showOverlay, keepSilentOverlay, hideOverlay };
