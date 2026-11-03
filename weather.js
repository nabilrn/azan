/* Jakarta adaptive weather module; fixed city, no geolocation. */
(function jakartaSky(){
"use strict";
const root=document.documentElement,scene=document.querySelector(".scene"),heroLeft=document.querySelector(".hero-left");
if(!scene||!heroLeft)return;
const API="https://api.open-meteo.com/v1/forecast?latitude=-6.2088&longitude=106.8456&current=temperature_2m,weather_code,is_day,cloud_cover,precipitation&daily=sunrise,sunset&timezone=Asia%2FJakarta&forecast_days=2";
const CACHE="ruangsalat:jakarta-weather:v1";
const icons={
clear:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/>',
cloudy:'<path d="M12 3v2m-7 3 1.3 1M19 8l-1.3 1"/><path d="M8 15h-.5a4.5 4.5 0 1 1 1.5-8.7A5 5 0 0 1 18 10a3.7 3.7 0 0 1 .5 7.4H8Z"/>',
overcast:'<path d="M6 19a4.5 4.5 0 0 1-.7-8.94A7 7 0 0 1 19 11a4 4 0 0 1-.8 8H6Z"/>',
rain:'<path d="M7 16a4 4 0 0 1-1-7.9A6.5 6.5 0 0 1 18.5 9a3.5 3.5 0 0 1-.5 7"/><path d="m8 19-1 3m6-3-1 3m6-3-1 3"/>',
storm:'<path d="M7 16a4 4 0 0 1-1-7.9A6.5 6.5 0 0 1 18.5 9a3.5 3.5 0 0 1-.5 7"/><path d="m13 15-4 6h4l-1 3 5-7h-4z"/>',
fog:'<path d="M5 12a4.5 4.5 0 0 1 .9-8.2A6.5 6.5 0 0 1 19 7.5a4 4 0 0 1-.6 8"/><path d="M3 19h18M6 22h12"/>',
unknown:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'};
const labels={clear:"Cerah",cloudy:"Berawan",overcast:"Mendung",rain:"Hujan",storm:"Badai petir",fog:"Berkabut",unknown:"Mode otomatis"};
const badge=document.createElement("div");
badge.className="weather-badge";badge.id="weatherBadge";badge.setAttribute("aria-label","Cuaca Jakarta");
badge.innerHTML='<span class="weather-symbol"><svg id="weatherGlyph" viewBox="0 0 24 24" aria-hidden="true">'+icons.unknown+'</svg></span><span class="weather-lines"><strong class="weather-main" id="weatherText">Sinkronisasi langit…</strong><small class="weather-caption"><span id="weatherMeta">Jakarta · WIB</span> · <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer" title="Sumber data cuaca">Open-Meteo</a></small></span>';
heroLeft.insertBefore(badge,heroLeft.firstChild);
const art=document.createElement("div");art.className="weather-art";art.setAttribute("aria-hidden","true");
art.innerHTML='<div class="sky-sun"></div><div class="weather-cloud one"></div><div class="weather-cloud two"></div><div class="weather-rain"></div>';
scene.insertBefore(art,scene.firstChild);
const formatter=new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Jakarta",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23"});
let weather=null,solar=null,lastAttempt=0,loading=false,isCached=false,lastPaint="";
function jakartaParts(date){const p=Object.fromEntries(formatter.formatToParts(date).filter(x=>x.type!=="literal").map(x=>[x.type,x.value]));return {date:`${p.year}-${p.month}-${p.day}`,minute:Number(p.hour)*60+Number(p.minute)}}
function sunMinute(s){if(typeof s!=="string")return null;const m=s.match(/T(\d{2}):(\d{2})/);return m?Number(m[1])*60+Number(m[2]):null}
function phaseFor(date){const p=jakartaParts(date);const same=solar?.date===p.date;const rise=same?solar.sunrise:330,set=same?solar.sunset:1080;return p.minute<rise||p.minute>=set?"night":p.minute<rise+30?"dawn":p.minute>=set-55?"sunset":"day"}
function classify(code,cloud){if(code===0||code===1)return"clear";if(code===2)return"cloudy";if(code===3)return"overcast";if(code===45||code===48)return"fog";if(code>=95)return"storm";if(code>=51&&code<=82||code>=85&&code<=86)return"rain";if(Number.isFinite(cloud))return cloud>=75?"overcast":cloud>=40?"cloudy":"clear";return"unknown"}
function paint(){const phase=phaseFor(new Date()),condition=weather?classify(weather.weather_code,weather.cloud_cover):"unknown",freshness=weather&&isCached?"Tersimpan":"Cuaca terkini",label=weather?`${labels[condition]} · ${Number.isFinite(weather.temperature_2m)?Math.round(weather.temperature_2m)+"°C":"Jakarta"}`:phase==="night"?"Malam di Jakarta":"Siang di Jakarta",subtitle=weather?`${freshness} · Jakarta`:"Berdasarkan jam WIB",key=[phase,condition,label,subtitle].join("|");
if(key===lastPaint)return;lastPaint=key;root.dataset.phase=phase;root.dataset.weather=condition;
document.querySelector('meta[name="theme-color"]')?.setAttribute("content",phase==="night"?"#081b27":phase==="sunset"?"#fff4e9":"#ebf7fc");
document.getElementById("weatherText").textContent=label;document.getElementById("weatherMeta").textContent=subtitle;document.getElementById("weatherGlyph").innerHTML=icons[condition];
badge.title=weather?"Cuaca estimasi Open-Meteo untuk Jakarta; diperbarui berkala.":"Data cuaca belum tersedia; tema mengikuti waktu WIB."}
function applyData(d,cached){const c=d?.current;if(!c||!Number.isFinite(c.weather_code))throw Error("Data cuaca tidak valid");weather=c;isCached=cached;const day=jakartaParts(new Date()).date,i=d.daily?.time?.indexOf(day)??-1;if(i>=0){const rise=sunMinute(d.daily.sunrise?.[i]),set=sunMinute(d.daily.sunset?.[i]);if(rise!==null&&set!==null&&rise<set)solar={date:day,sunrise:rise,sunset:set}}paint()}
function readCache(){try{const saved=JSON.parse(localStorage.getItem(CACHE));if(saved&&typeof saved.savedAt==="number"&&Date.now()-saved.savedAt<3600000&&Number.isFinite(saved.data?.current?.weather_code))applyData(saved.data,true)}catch{}}
async function fetchWeather(force=false){const now=Date.now();if(loading||!force&&now-lastAttempt<(weather?600000:180000))return;lastAttempt=now;loading=true;const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),8500);try{const response=await fetch(API,{signal:ctrl.signal,cache:"no-store"});if(!response.ok)throw Error(`Weather HTTP ${response.status}`);const d=await response.json();applyData(d,false);try{localStorage.setItem(CACHE,JSON.stringify({savedAt:Date.now(),data:d}))}catch{}}catch(err){console.warn("Cuaca Jakarta tidak tersedia:",err);if(!weather)paint()}finally{clearTimeout(timer);loading=false}}
readCache();paint();fetchWeather();setInterval(()=>{paint();fetchWeather()},30000);
document.addEventListener("visibilitychange",()=>{if(!document.hidden){paint();fetchWeather()}});
window.addEventListener("online",()=>fetchWeather(true));
})();
