import {LitElement,css,html} from 'lit';
import {customElement,property,state} from 'lit/decorators.js';
const KEY='savanna.prefs.v1',PREFIX='savanna-pack-';
function read(){try{return {savedLessons:[],...JSON.parse(localStorage.getItem(KEY)||'{}').offline};}catch{return {savedLessons:[]};}}
@customElement('savanna-offline')
export class SavannaOffline extends LitElement{
 static styles=css`:host{display:block;font:16px/1.5 system-ui;color:inherit}button{min-height:44px;padding:9px 14px;border:0;border-radius:9px;background:#5b3477;color:white;font:inherit;font-weight:600;cursor:pointer;transition:background .2s}button:hover:not(:disabled){background:#4a2a62}button:focus-visible{outline:3px solid #e09b00;outline-offset:3px}button:disabled{opacity:.5;cursor:not-allowed}progress{width:min(100%,360px);height:20px;border-radius:10px;overflow:hidden}.row{display:flex;flex-wrap:wrap;gap:8px}.size{font-size:.875em;opacity:.9}.progress-container{margin:12px 0}.progress-text{margin:6px 0 0;font-size:.9375rem;color:#666}.status-icon{display:inline-block;margin-right:6px}.success{color:#2e7d32;font-weight:600}.info{color:#0d47a1}`;
 @property() api=''; @property({attribute:'api-key'}) apiKey=''; @property({attribute:'lesson-id'}) lessonId='';
 @state() private manifest:any=null; @state() private status='Load a lesson pack to begin.'; @state() private busy=false; @state() private progress=0; @state() private saved=false;
 private startTime=0;
 private lastProgress=0;
 
 private statusIcon(){if(this.saved)return'✅';if(this.busy)return'⏳';if(this.manifest)return'📦';return'ℹ️';}
 private estimateTime(){if(this.progress<=0||!this.startTime)return'';const elapsed=Date.now()-this.startTime,rate=this.progress/elapsed,remaining=(100-this.progress)/rate;if(!isFinite(remaining)||remaining<0)return'';const sec=Math.ceil(remaining/1000);return sec<60?`~${sec}s remaining`:`~${Math.ceil(sec/60)}m remaining`;}
 connectedCallback(){super.connectedCallback();this.saved=read().savedLessons.includes(this.lessonId);void this.refresh();}
 updated(changed:Map<string,unknown>){if((changed.has('api')||changed.has('lessonId'))&&this.lessonId&&!this.manifest)void this.refresh();}
 private url(){const base=(this.api||'').replace(/\/$/,'');return `${base}/v1/lessons/${encodeURIComponent(this.lessonId)}/pack`;}
 private headers(): Record<string, string>{return this.apiKey?{'X-Savanna-Key':this.apiKey}:{};}
 private async refresh(){if(!this.lessonId)return;try{const r=await fetch(this.url(),{headers:this.headers()});if(!r.ok)throw Error(r.status===404?'Pack is not published.':`Manifest request failed (${r.status}).`);this.manifest=await r.json();this.status=`Pack ready · ${this.size(this.manifest.sizeBytes||0)}`;}catch(e){this.status=(e as Error).message;}}
 private size(n:number){return n<1024?`${n} B`:n<1048576?`${(n/1024).toFixed(1)} KB`:`${(n/1048576).toFixed(2)} MB`;}
 private async save(){
  if(this.busy||!this.manifest)return;
  
  this.busy=true;this.progress=0;this.startTime=Date.now();
  try{
    const url=this.url()+'.zip',r=await fetch(url,{headers:this.headers()});
    if(!r.ok)throw Error(`Download failed (${r.status}).`);
    const total=Number(r.headers.get('content-length'))||this.manifest.sizeBytes||0,reader=r.body?.getReader();
    if(!reader)throw Error('Streaming download is not supported.');
    const chunks:Uint8Array[]=[];let got=0,lastAnnounce=0;
    while(true){
      const x=await reader.read();
      if(x.done)break;
      if(x.value){
        chunks.push(x.value);got+=x.value.length;
        const newProgress=total?Math.round(got/total*100):0;
        if(newProgress>=lastAnnounce+10){this.progress=newProgress;lastAnnounce=newProgress;}
        else{this.progress=newProgress;}
      }
    }
    const blob=new Blob(chunks as BlobPart[],{type:'application/zip'});

    // Trigger direct file download to user's device/disk
    try {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${this.lessonId}-2g-offline-pack.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch(err) {
      console.warn('[offline] Download trigger error:', err);
    }
    
    // Store in Cache Storage API if available
    if(typeof caches!=='undefined'){
      try {
        const cache=await caches.open(PREFIX+this.lessonId);
        await cache.put(url,new Response(blob,{headers:{'Content-Type':'application/zip','Content-Length':String(blob.size)}}));
      } catch(e) {
        console.warn('[offline] Cache save error:', e);
      }
    }
    
    // Store lesson ID in localStorage
    const p=read();
    p.savedLessons=[...new Set([...p.savedLessons,this.lessonId])];
    const a=JSON.parse(localStorage.getItem(KEY)||'{}');
    a.offline=p;
    localStorage.setItem(KEY,JSON.stringify(a));
    
    this.saved=true;this.progress=100;
    this.status=`✓ Saved offline & downloaded · ${this.size(blob.size)}`;
  }catch(e){
    const errorMsg = (e as Error).message;
    this.status=`❌ ${errorMsg}`;
  }finally{
    this.busy=false;this.startTime=0;
  }
 }
 private async deleteOfflineCopy(){
  // Check if Cache Storage API is available
  if(typeof caches==='undefined'){
    // Cache API not available, but we can still clear localStorage
    const p=read();
    p.savedLessons=p.savedLessons.filter((x:string)=>x!==this.lessonId);
    const a=JSON.parse(localStorage.getItem(KEY)||'{}');
    a.offline=p;
    localStorage.setItem(KEY,JSON.stringify(a));
    this.saved=false;
    this.progress=0;
    this.status='⚠️ Offline copy cleared from localStorage (Cache API unavailable - requires HTTPS/localhost).';
    return;
  }
  
  try {
    await caches.delete(PREFIX+this.lessonId);
  } catch(e) {
    console.warn('[offline] Cache delete failed:', e);
  }
  
  const p=read();
  p.savedLessons=p.savedLessons.filter((x:string)=>x!==this.lessonId);
  const a=JSON.parse(localStorage.getItem(KEY)||'{}');
  a.offline=p;
  localStorage.setItem(KEY,JSON.stringify(a));
  this.saved=false;
  this.progress=0;
  this.status='Offline copy deleted from this device.';
 }
 render(){return html`<div class="row">${this.saved?html`<button @click=${this.deleteOfflineCopy} ?disabled=${this.busy} aria-label="Delete offline copy">🗑️ Delete offline copy</button>`:html`<button @click=${this.save} ?disabled=${this.busy||!this.manifest} aria-label="Save for offline">${this.busy?'⏸':'📥'} Save for offline${this.manifest&&!this.busy?html` <span class="size">(${this.size(this.manifest.sizeBytes||0)})</span>`:''}</button>`}<button @click=${this.refresh} ?disabled=${this.busy} aria-label="Refresh pack information">🔄 Refresh</button></div>${this.busy?html`<div class="progress-container"><progress max="100" .value=${this.progress} aria-label="Download progress ${this.progress} percent"></progress><p class="progress-text"><strong>${this.progress}%</strong> ${this.estimateTime()}</p></div>`:''}<p role="status" aria-live="polite" class="${this.saved?'success':this.busy?'info':''}"><span class="status-icon">${this.statusIcon()}</span> ${this.status}</p>`;}
}
