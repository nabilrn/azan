// IndexedDB storage for custom and downloaded preset audio.
const audioJobs=new Map(), cachedTracks=new Map();
function openDB(){
  return new Promise((resolve,reject)=>{
    if(!('indexedDB'in window))return reject(Error('IndexedDB tidak tersedia'));
    const req=indexedDB.open('RuangSalatAudio',1);
    req.onupgradeneeded=()=>req.result.createObjectStore('audio');
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
    req.onblocked=()=>reject(Error('IndexedDB terkunci'))
  })
}
// Local browser audio cache; no base64 in localStorage and no redistribution in the repository.
async function readCachedTrack(url){
  if(cachedTracks.has(url))return cachedTracks.get(url);
  let db;
  try{
    db=await openDB();
    const row=await new Promise((resolve,reject)=>{
      const req=db.transaction('audio','readonly').objectStore('audio').get('preset:'+url);
      req.onsuccess=()=>resolve(req.result);
      req.onerror=()=>reject(req.error)
    });
    if(row?.blob?.size){
      cachedTracks.set(url,row.blob);
      return row.blob
    }
  }catch(err){
    console.warn('Cache audio:',err)
  }finally{
    db?.close()
  }return null;
}
async function cacheTrack(url){
  if(audioJobs.has(url))return audioJobs.get(url);
  const job=(async()=>{
    if(await readCachedTrack(url))return true;
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),30000);
    let db;
    try{
      const res=await fetch(url,{
        signal:controller.signal,mode:'cors'
      });
      if(!res.ok)throw Error('HTTP '+res.status);
      const blob=await res.blob();
      if(!blob.size||blob.size>20*1024*1024||!/^(audio\/|application\/(ogg|octet-stream))/i.test(blob.type))throw Error('Format audio tidak valid');
      db=await openDB();
      await new Promise((resolve,reject)=>{
        const tx=db.transaction('audio','readwrite');
        tx.objectStore('audio').put({
          blob
        },'preset:'+url);
        tx.oncomplete=resolve;
        tx.onerror=()=>reject(tx.error);
        tx.onabort=()=>reject(tx.error)
      });
      cachedTracks.set(url,blob);
      return true
    }
    catch(err){
      console.warn('Prefetch azan:',err);
      return false
    }finally{
      clearTimeout(timer);
      db?.close()
    }
  })();
  audioJobs.set(url,job);
  try{
    return await job
  }finally{
    audioJobs.delete(url)
  }
}
async function saveAudio(file){
  const db=await openDB();
  await new Promise((resolve,reject)=>{
    const tx=db.transaction('audio','readwrite');
    tx.objectStore('audio').put({
      blob:file,name:file.name
    },'custom');
    tx.oncomplete=resolve;
    tx.onerror=()=>reject(tx.error)
  });
  db.close()
}
export { openDB, readCachedTrack, cacheTrack, saveAudio };
