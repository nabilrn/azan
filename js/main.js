import { $, state } from './config.js';
import { toast, changeSource } from './ui.js';
import { update, localDate, ensureSchedules, setPrayerHandler } from './schedule.js';
import { initAudio, onPrayerStarts, warmAudio } from './audio.js';
import './weather.js';
// Wire the dashboard once, after the HTML has been parsed.
setPrayerHandler(onPrayerStarts);
$('fullscreenBtn').addEventListener('click',async()=>{
  try{
    if(document.fullscreenElement)await document.exitFullscreen();
    else await document.documentElement.requestFullscreen()
  }catch{
    toast('Gunakan F11 untuk masuk layar penuh')
  }
});
$('settingsBtn').addEventListener('click',()=>$('settingsDialog').showModal());
$('closeSettings').addEventListener('click',()=>$('settingsDialog').close());
$('settingsDialog').addEventListener('click',e=>{
  if(e.target===$('settingsDialog'))$('settingsDialog').close()
});
document.addEventListener('visibilitychange',()=>{
  if(!document.hidden){
    update();
    if(!state.schedules.has(localDate()))ensureSchedules().catch(()=>{
    })
  }
});
window.addEventListener('online',()=>{
  ensureSchedules().catch(()=>{
  });
  warmAudio()
});
state.lastTickMs = Date.now();
initAudio();
update();
ensureSchedules().catch(err => {
  console.warn(err);
  changeSource('Jadwal gagal dimuat · cek koneksi internet', false);
  state.retryAt = Date.now() + 60000;
});
setInterval(update, 500);
