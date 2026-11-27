const TZ = 'Asia/Jakarta';
const PRAYERS = [
{
  key:'subuh', name:'Subuh'
}, {
  key:'dzuhur', name:'Dzuhur'
},
{
  key:'ashar', name:'Ashar'
}, {
  key:'maghrib', name:'Maghrib'
}, {
  key:'isya', name:'Isya'
}
];
// Public access is not a redistribution license. Kurdi streams from its external host, never bundled.
const AUDIO_PRESETS = {
  kurdi: {
    url:'https://archive.org/download/azan-alafasy/azan-kard-2014-other.mp3', fajrUrl:'https://archive.org/download/azan-alafasy/azan-kard-2014-al-fajr.mp3', name:'Sheikh Mishary Alafasy · Kurdi', page:'https://alafasyinshad.blogspot.com/2014/07/azan-kard-al-fajr-mp3.html', credit:'Mishary Alafasy · Kurd 2014 · arsip audio publik (izin redistribusi belum dikonfirmasi)', host:'Internet Archive'
  },
  lantang: {
    url:'https://upload.wikimedia.org/wikipedia/commons/b/b0/Beautiful_adhan.ogg', name:'Azan lengkap', page:'https://commons.wikimedia.org/wiki/File:Beautiful_adhan.ogg', credit:'Adam-synagda · CC0 1.0'
  },
  tegas: {
    url:'https://upload.wikimedia.org/wikipedia/commons/7/7d/The_Adhan_-_Muslim_Call_to_Prayer_-_Aaqib_Azeez.mp3', name:'Azan Aaqib Azeez', page:'https://commons.wikimedia.org/wiki/File:The_Adhan_-_Muslim_Call_to_Prayer_-_Aaqib_Azeez.mp3', credit:'Atcovi · CC BY-SA 4.0'
  },
  lama: {
    url:'https://upload.wikimedia.org/wikipedia/commons/a/a9/Muslim_calling_to_prayer.ogg', name:'Suara sebelumnya', page:'https://commons.wikimedia.org/wiki/File:Muslim_calling_to_prayer.ogg', credit:'Aishatu98 · CC0 1.0'
  }
};
const DEFAULT_PRESET = 'kurdi';
function savedPreset(){
  try{
    const val=localStorage.getItem('ruangsalat:audioPreset:v2');
    return AUDIO_PRESETS[val]?val:DEFAULT_PRESET
  }catch{
    return DEFAULT_PRESET
  }
}
const $ = id => document.getElementById(id);
const state = {
  schedules:new Map(), yearJobs:new Map(), monthJobs:new Map(), date:'', next:null, nextMs:0, current:'', audioEnabled:false, playing:false, demo:false, lastTickMs:Date.now(), source:'', customUrl:null, audioPreset:savedPreset(), audioContext:null, audioNode:null, audioGain:null, audioLimiter:null, retryAt:0, loading:false
};
export { TZ, PRAYERS, AUDIO_PRESETS, DEFAULT_PRESET, $, state };
