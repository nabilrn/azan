(() => {
  const root=document.documentElement;
  const current=document.getElementById('weatherText');
  const meta=document.getElementById('weatherMeta');
  const theme=document.querySelector('meta[name="theme-color"]');
  const endpoint='https://api.open-meteo.com/v1/forecast?latitude=-6.3022&longitude=106.8429&current=temperature_2m,weather_code,cloud_cover,precipitation&daily=sunrise,sunset&timezone=Asia%2FJakarta&forecast_days=2';
  const key='ruangsalat:weather-tb-simatupang-v1';
  const fmt=new Intl.DateTimeFormat('en-GB',{
    timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'
  });
  const labels={
    clear:'Cerah',cloudy:'Berawan',overcast:'Mendung',rain:'Hujan',storm:'Badai petir',fog:'Berkabut',unknown:'TB Simatupang'
  };
  let weather=null,solar=null,lastAttempt=0,loading=false,cached=false;
  function nowParts(){
    const p=Object.fromEntries(fmt.formatToParts(new Date()).filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));
    return{
      date:`${p.year}-${p.month}-${p.day}`,minute:+p.hour*60+(+p.minute)
    }
  }
  function minute(s){
    const m=typeof s==='string'&&s.match(/T(\d\d):(\d\d)/);
    return m?(+m[1]*60+ +m[2]):null
  }
  function phase(){
    const p=nowParts(),rise=solar?.date===p.date?solar.rise:330,set=solar?.date===p.date?solar.set:1080;
    return p.minute<rise||p.minute>=set?'night':p.minute<rise+35?'dawn':p.minute>=set-55?'sunset':'day'
  }
  function condition(c,cloud){
    if(c===0||c===1)return'clear';
    if(c===2)return'cloudy';
    if(c===3)return'overcast';
    if(c===45||c===48)return'fog';
    if(c>=95)return'storm';
    if((c>=51&&c<=82)||(c>=85&&c<=86))return'rain';
    if(Number.isFinite(cloud))return cloud>=75?'overcast':cloud>=38?'cloudy':'clear';
    return'unknown'
  }
  function paint(){
    const ph=phase(),cond=weather?condition(weather.weather_code,weather.cloud_cover):'unknown';
    root.dataset.phase=ph;
    root.dataset.weather=cond;
    const t=weather&&Number.isFinite(weather.temperature_2m)?` · ${Math.round(weather.temperature_2m)}°C`:'';
    current.textContent=weather?labels[cond]+t:(ph==='night'?'Malam di TB Simatupang':'Langit TB Simatupang');
    meta.textContent=cached?'Cuaca tersimpan · WIB':weather?'Cuaca TB Simatupang · WIB':'Tema otomatis · WIB';
    theme?.setAttribute('content',ph==='night'?'#0a1730':ph==='sunset'?'#a7699b':'#4489cd')
  }
  function take(d,wasCached){
    if(!Number.isFinite(d?.current?.weather_code))return;
    weather=d.current;
    cached=wasCached;
    const i=d.daily?.time?.indexOf(nowParts().date)??-1;
    if(i>=0){
      const rise=minute(d.daily.sunrise?.[i]),set=minute(d.daily.sunset?.[i]);
      if(rise!==null&&set!==null&&rise<set)solar={
        date:nowParts().date,rise,set
      }
    }paint()
  }
  try{
    const o=JSON.parse(localStorage.getItem(key));
    if(o&&Date.now()-o.ts<3600000)take(o.data,true)
  }catch{
  }
  paint();
  async function fetchWeather(force=false){
    if(loading||!force&&Date.now()-lastAttempt<(weather?600000:180000))return;
    lastAttempt=Date.now();
    loading=true;
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8500);
    try{
      const r=await fetch(endpoint,{
        signal:controller.signal,cache:'no-store'
      });
      if(!r.ok)throw Error('Cuaca '+r.status);
      const d=await r.json();
      take(d,false);
      try{
        localStorage.setItem(key,JSON.stringify({
          ts:Date.now(),data:d
        }))
      }catch{
      }
    }catch(err){
      console.warn('Cuaca TB Simatupang:',err)
    }finally{
      clearTimeout(timer);
      loading=false
    }
  }
  fetchWeather();
  setInterval(()=>{
    paint();
    fetchWeather()
  },30000);
  document.addEventListener('visibilitychange',()=>{
    if(!document.hidden){
      paint();
      fetchWeather()
    }
  });
  window.addEventListener('online',()=>fetchWeather(true));
})();
