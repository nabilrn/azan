import { $, state, AUDIO_PRESETS, DEFAULT_PRESET } from './config.js';
import { toast, showOverlay, keepSilentOverlay, hideOverlay } from './ui.js';
import { storeLastFired, alreadyFired } from './schedule.js';
import { openDB, readCachedTrack, cacheTrack, saveAudio } from './audio-cache.js';
const audio=$('azanAudio');
let playbackToken=0, activeTrackUrl=null, activeTrackKey=null;
audio.src=AUDIO_PRESETS[state.audioPreset].url;
audio.preload='auto';
function onPrayerStarts(p){
  if(alreadyFired(p))return;
  storeLastFired(p);
  if(state.audioEnabled){
    playAzan(p.name,false,p.time)
  }else{
    stopAzan();
    showOverlay(p.name,false,p.time);
    keepSilentOverlay(stopAzan);
    toast('Waktu '+p.name+' telah tiba · suara belum diaktifkan')
  }
}
function stopAzan(){
  playbackToken++;
  audio.pause();
  try{
    audio.currentTime=0
  }catch{
  }state.playing=false;
  state.demo=false;
  hideOverlay()
}
async function activateAudio(){
  if(state.audioEnabled){
    state.audioEnabled=false;
    stopAzan();
    setSoundUi();
    toast('Audio azan dinonaktifkan');
    return
  }try{
    // Resume Web Audio in the user's gesture. Media is connected so subsequent
    // scheduled playbacks are still audible in browsers with gesture restrictions.
    const AC=window.AudioContext||window.webkitAudioContext;
    if(AC&&!state.audioContext){
      state.audioContext=new AC();
      state.audioNode=state.audioContext.createMediaElementSource(audio);
      state.audioGain=state.audioContext.createGain();
      // Amplify quiet recordings, then constrain peaks to minimize clipping.
      state.audioLimiter=state.audioContext.createDynamicsCompressor();
      state.audioLimiter.threshold.value=-12;
      state.audioLimiter.knee.value=6;
      state.audioLimiter.ratio.value=14;
      state.audioLimiter.attack.value=0.003;
      state.audioLimiter.release.value=0.2;
      state.audioNode.connect(state.audioGain);
      state.audioGain.connect(state.audioLimiter);
      state.audioLimiter.connect(state.audioContext.destination);
      applyVolume();
    }
    if(state.audioContext?.state==='suspended')await state.audioContext.resume();
    state.audioEnabled=true;
    setSoundUi();
    warmAudio();
    toast('Azan aktif · pastikan tab tetap terbuka');
  }catch(err){
    console.warn(err);
    state.audioEnabled=false;
    setSoundUi();
    toast('Gagal mengaktifkan audio. Coba lagi.')
  }
}
function setSoundUi(){
  const on=state.audioEnabled;
  $('soundBtn').classList.toggle('activated',on);
  $('soundBtn').setAttribute('aria-pressed',String(on));
  $('soundText').textContent=on?'Azan aktif':'Aktifkan azan';
  $('soundBtn').title=on?'Nonaktifkan audio':'Aktifkan audio azan';
  $('soundIcon').innerHTML=on?'<path d="M11 5 6 9H3v6h3l5 4V5Z"/><path d="M16 9a5 5 0 0 1 0 6"/><path d="M19 6a9 9 0 0 1 0 12"/>':'<path d="M11 5 6 9H3v6h3l5 4V5Z"/><path d="m16 9 5 6m0-6-5 6"/>'
}
function currentTrack(name){
  if(state.customUrl)return state.customUrl;
  const entry=AUDIO_PRESETS[state.audioPreset];
  return name==='Subuh'&&entry.fajrUrl?entry.fajrUrl:entry.url;
}
async function playAzan(name,demo,time=''){
  stopAzan();
  const token=playbackToken;
  showOverlay(name,demo,time);
  state.demo=demo;
  const track=currentTrack(name);
  try{
    const blob=state.customUrl?null:await readCachedTrack(track);
    if(token!==playbackToken)return;
    if(activeTrackKey!==track||(!activeTrackUrl&&blob)){
      if(activeTrackUrl)URL.revokeObjectURL(activeTrackUrl);
      activeTrackUrl=blob?URL.createObjectURL(blob):null;
      activeTrackKey=track;
    }
    const src=activeTrackUrl||track;
    if(audio.src!==src){
      audio.src=src;
      audio.load()
    }
    applyVolume();
    audio.muted=false;
    try{
      audio.currentTime=0
    }catch{
    }
    if(state.audioContext?.state==='suspended')await state.audioContext.resume();
    if(token!==playbackToken)return;
    await audio.play();
    if(token!==playbackToken)return;
    state.playing=true;
  }catch(err){
    if(token!==playbackToken)return;
    console.warn('Audio tidak dapat diputar:',err);
    state.playing=false;
    if(demo)hideOverlay();
    else keepSilentOverlay(stopAzan);
    toast('Audio gagal diputar. Cek koneksi atau pilih audio lokal di pengaturan.')
  }
}
audio.addEventListener('ended',()=>{
  if(state.playing)stopAzan()
});
audio.addEventListener('error',()=>{
  if(state.playing){
    state.playing=false;
    if(state.demo)stopAzan();
    else keepSilentOverlay(stopAzan);
    toast('Rekaman azan tidak dapat dimuat.')
  }
});
// Audio volume can exceed 100% through Web Audio amplification.
// A fresh setting key deliberately defaults previous low-volume installs to 250%.
function applyVolume(){
  const v=Math.min(400,Math.max(0,Number($('volumeSlider').value)||0));
  audio.volume=Math.min(v,100)/100;
  if(state.audioGain&&state.audioContext){
    const boost=Math.max(1,v/100);
    state.audioGain.gain.setTargetAtTime(boost,state.audioContext.currentTime,0.015);
  }
  $('volumeValue').textContent=v+'%';
}
function reflectPreset(){
  document.querySelectorAll('[data-azan-preset]').forEach(btn=>{
    const current=btn.dataset.azanPreset===state.audioPreset&&!state.customUrl;
    btn.classList.toggle('active',current);
    btn.setAttribute('aria-pressed',String(current));
  });
  const entry=AUDIO_PRESETS[state.audioPreset];
  $('audioSource').textContent=state.customUrl?'Audio lokal pilihanmu':entry.name+' · '+(entry.host||'Wikimedia Commons');
  $('previewFajr').hidden=Boolean(state.customUrl||!entry.fajrUrl);
  $('audioRightsNote').hidden=Boolean(state.customUrl||!entry.fajrUrl);
  const link=$('audioCreditLink');
  link.href=entry.page;
  link.textContent=entry.credit;
  $('audioLicense').hidden=Boolean(state.customUrl);
}
async function warmAudio(){
  if(state.customUrl)return;
  const preset=state.audioPreset,entry=AUDIO_PRESETS[preset];
  const tracks=[...new Set([entry.url,entry.fajrUrl].filter(Boolean))];
  const results=await Promise.all(tracks.map(cacheTrack));
  if(state.audioPreset===preset&&!state.customUrl){
    $('audioSource').textContent=entry.name+' · '+(results.every(Boolean)?'Audio tersimpan lokal':'Streaming / cache belum lengkap')
  }
}
async function removeCustom(){
  try{
    const db=await openDB();
    await new Promise((resolve,reject)=>{
      const tx=db.transaction('audio','readwrite');
      tx.objectStore('audio').delete('custom');
      tx.oncomplete=resolve;
      tx.onerror=()=>reject(tx.error)
    });
    db.close()
  }catch(err){
    console.warn('Reset audio lokal:',err)
  }
  if(state.customUrl)URL.revokeObjectURL(state.customUrl);
  state.customUrl=null;
}
function setPreset(key){
  if(!AUDIO_PRESETS[key])return;
  stopAzan();
  state.audioPreset=key;
  try{
    localStorage.setItem('ruangsalat:audioPreset:v2',key)
  }catch{
  }
  if(state.customUrl)URL.revokeObjectURL(state.customUrl);
  state.customUrl=null;
  audio.src=AUDIO_PRESETS[key].url;
  audio.load();
  activeTrackKey=null;
  reflectPreset();
  warmAudio();
}
async function loadCustom(){
  try{
    const db=await openDB();
    const data=await new Promise((resolve,reject)=>{
      const req=db.transaction('audio','readonly').objectStore('audio').get('custom');
      req.onsuccess=()=>resolve(req.result);
      req.onerror=()=>reject(req.error)
    });
    db.close();
    if(data?.blob){
      if(state.customUrl)URL.revokeObjectURL(state.customUrl);
      state.customUrl=URL.createObjectURL(data.blob);
      audio.src=state.customUrl;
      audio.load();
      reflectPreset();
      $('audioSource').textContent=data.name;
      return true
    }
  }catch(err){
    console.warn('Local audio:',err)
  }reflectPreset();
  return false
}
async function previewAzan(prayer){
  $('settingsDialog').close();
  if(!state.audioEnabled){
    await activateAudio();
    if(!state.audioEnabled)return
  }
  await playAzan(prayer,true);
}
function initAudio() {
  $('soundBtn').addEventListener('click',activateAudio);
  $('testBtn').addEventListener('click',async()=>{
    if(!state.audioEnabled){
      await activateAudio();
      if(!state.audioEnabled)return
    }playAzan('Tes Azan',true)
  });
  $('stopAzanBtn').addEventListener('click',stopAzan);
  $('azanClose').addEventListener('click',stopAzan);
  try{
    $('volumeSlider').value=localStorage.getItem('ruangsalat:volumeBoost')??250
  }catch{
    $('volumeSlider').value=250
  }
  applyVolume();
  $('volumeSlider').addEventListener('input',()=>{
    applyVolume();
    try{
      localStorage.setItem('ruangsalat:volumeBoost',$('volumeSlider').value)
    }catch{
    }
  });
  document.querySelectorAll('[data-azan-preset]').forEach(btn=>btn.addEventListener('click',async()=>{
    // Switching preset also clears a previously uploaded custom audio.
    await removeCustom();
    setPreset(btn.dataset.azanPreset);
    toast('Suara dipilih · tekan Dengarkan untuk mengetes');
  }));
  $('previewSelected').addEventListener('click',()=>previewAzan('Tes Azan'));
  $('previewFajr').addEventListener('click',()=>previewAzan('Subuh'));
  $('audioFile').addEventListener('change',async e=>{
    const file=e.target.files?.[0];
    if(!file)return;
    if(!file.type.startsWith('audio/')){
      toast('Pilih berkas audio yang valid');
      return
    }if(file.size>20*1024*1024){
      toast('Ukuran audio maksimal 20 MB');
      return
    }try{
      stopAzan();
      await saveAudio(file);
      await loadCustom();
      toast('Rekaman azan lokal berhasil disimpan')
    }catch(err){
      console.warn(err);
      toast('Gagal menyimpan audio. Coba browser lain.')
    }e.target.value=''
  });
  $('resetAudio').addEventListener('click',async()=>{
    await removeCustom();
    setPreset(DEFAULT_PRESET);
    toast('Azan bawaan dipulihkan')
  });
  reflectPreset();
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'&&$('azanOverlay').classList.contains('visible'))stopAzan()
  });
  setSoundUi();
  loadCustom().then(found => {
    if (!found) warmAudio();
  });
}
export { onPrayerStarts, warmAudio, initAudio };
