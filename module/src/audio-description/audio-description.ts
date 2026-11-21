import {LitElement,css,html} from 'lit';
import {customElement,property,state} from 'lit/decorators.js';
type Cue={start:number;end:number;text:string};
const KEY='savanna.prefs.v1';
function prefs(){try{return {enabled:false,extended:false,mode:'speech',...JSON.parse(localStorage.getItem(KEY)||'{}').ad};}catch{return {enabled:false,extended:false,mode:'speech'};}}
@customElement('savanna-audio-description')
export class SavannaAudioDescription extends LitElement{
 static styles=css`:host{display:block;font:16px/1.5 system-ui;color:inherit}button,select{min-height:44px;padding:8px 12px;border:1px solid #72548a;border-radius:8px;background:white;color:#241b2b;font:inherit}button:focus-visible,select:focus-visible{outline:3px solid #e09b00;outline-offset:2px}.controls{display:flex;flex-wrap:wrap;gap:8px;align-items:center}.ad-badge{display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:16px;background:#4caf50;color:white;font-size:13px;font-weight:700;animation:fadeIn .3s}@keyframes fadeIn{from{opacity:0}to{opacity:1}}.ad-badge-off{background:#666}`;
 @property() src=''; @property({attribute:'text-vtt'}) textVtt=''; @property({type:Number,attribute:'offset-ms'}) offsetMs=0;
 @state() private p=prefs(); @state() private status='Audio description is off.'; @state() private cues:Cue[]=[]; @state() private active='';
 private player?:HTMLElement; private media?:HTMLMediaElement; private audio?:HTMLAudioElement; private wasPlaying=false; private lastTime=-1; private lastSpokenCue=-1;
 connectedCallback(){super.connectedCallback();this.player=this.closest('savanna-player') as HTMLElement|undefined;this.media=(this.player as any)?.media;this.player?.addEventListener('savanna:timeupdate',this.time as EventListener);if(this.textVtt)void this.load();}
 disconnectedCallback(){this.player?.removeEventListener('savanna:timeupdate',this.time as EventListener);this.stop(false);super.disconnectedCallback();}
 firstUpdated(){this.audio=this.renderRoot.querySelector('audio')||undefined;if(!this.media){this.player=this.closest('savanna-player') as HTMLElement|undefined;this.media=(this.player as any)?.media;}}
 private save(){try{const a=JSON.parse(localStorage.getItem(KEY)||'{}');a.ad=this.p;localStorage.setItem(KEY,JSON.stringify(a));}catch{}}
 private async load(){try{const r=await fetch(this.textVtt);if(!r.ok)throw Error();const v=await r.text();const blocks=v.replace(/\r/g,'').split(/\n\n+/);this.cues=blocks.map(b=>{const lines=b.split('\n'),i=lines.findIndex(x=>x.includes('-->'));if(i<0)return null;const line=lines[i]||'';const parts=line.split('-->');const sec=(s:string)=>{const [timePart='0',fracPart='0']=s.trim().split(/[,.]/);const totalSec=(timePart||'0').split(':').map(Number).reduce((a,n)=>a*60+n,0);return totalSec+Number('0.'+(fracPart||'0'));};return {start:sec(parts[0]||'0'),end:sec(parts[1]||'0'),text:lines.slice(i+1).join(' ')};}).filter(Boolean) as Cue[];}catch{this.status='Text description could not be loaded.';}}
 /** Called by the owning player for its D shortcut; no competing global listener is installed. */
 public toggle(){if(this.p.enabled)this.stop();else void this.play();}
 private speakCue(text:string){
   if(typeof window==='undefined'||!window.speechSynthesis){
     this.status=text;
     return;
   }
   try{
     window.speechSynthesis.cancel();
     const u=new SpeechSynthesisUtterance(text);
     const isAm=/[\u1200-\u137F]/.test(text)||(this.player as any)?.lang==='am'||(this.textVtt&&this.textVtt.includes('am.vtt'));
     u.lang=isAm?'am-ET':'en-US';
     const voices=window.speechSynthesis.getVoices?window.speechSynthesis.getVoices():[];
     if(isAm){
       const amVoice=voices.find(v=>v.lang.startsWith('am')||v.name.toLowerCase().includes('amharic')||v.name.toLowerCase().includes('ethiopic'));
       if(amVoice)u.voice=amVoice;
     }else{
       const enVoice=voices.find(v=>v.lang.startsWith('en')&&(v.name.includes('Natural')||v.name.includes('Google')||v.name.includes('Microsoft')||v.default));
       if(enVoice)u.voice=enVoice;
     }
     u.rate=1.0;
     if(this.p.extended&&this.media&&!this.media.paused){
       this.wasPlaying=true;
       this.media.pause();
       u.onend=()=>{if(this.wasPlaying&&this.media){this.wasPlaying=false;this.media.play().catch(()=>{});}};
       u.onerror=()=>{if(this.wasPlaying&&this.media){this.wasPlaying=false;this.media.play().catch(()=>{});}};
     }
     window.speechSynthesis.speak(u);
   }catch{
     this.status=text;
   }
 }
 private time=(e:Event)=>{
   const d=(e as CustomEvent).detail;
   if(!d)return;
   if(d.paused){
     if(typeof window!=='undefined'&&window.speechSynthesis)try{window.speechSynthesis.cancel();}catch{}
     if(this.audio&&!this.audio.paused)this.audio.pause();
     return;
   }
   if(this.lastTime>=0&&Math.abs(d.time-this.lastTime)>1.5){
     if(typeof window!=='undefined'&&window.speechSynthesis)try{window.speechSynthesis.cancel();}catch{}
     this.lastSpokenCue=-1;
   }
   this.lastTime=d.time;
   if(this.p.enabled&&(this.p.mode==='text'||this.p.mode==='speech')){
     const c=this.cues.find(x=>d.time>=x.start&&d.time<x.end);
     if(c){
       if(c.text!==this.active){
         this.active=c.text;
         this.status=c.text;
       }
       if(this.p.mode==='speech'&&this.lastSpokenCue!==c.start){
         this.lastSpokenCue=c.start;
         this.speakCue(c.text);
       }
     }
   }
   if(this.p.enabled&&this.p.mode==='audio'&&this.audio&&this.src){
     const target=Math.max(0,d.time-this.offsetMs/1000);
     if(Math.abs(this.audio.currentTime-target)>.45)try{this.audio.currentTime=target;}catch{}
     this.audio.playbackRate=d.rate||1;
     if(d.paused){this.audio.pause();}else if(this.audio.paused)void this.audio.play().catch(()=>{});
   }
 };
 private async play(){
   this.p={...this.p,enabled:true};
   this.save();
   if(this.p.mode==='speech'){
     const hasSynth=typeof window!=='undefined'&&!!window.speechSynthesis;
     if(!hasSynth){
       this.status='Speech synthesis is unavailable in this environment. Showing text descriptions.';
       return;
     }
     this.status=this.active||'Spoken voice descriptions (TTS) are active. Play lesson to hear audio cues.';
     if(this.active){this.speakCue(this.active);}
     return;
   }
   if(this.p.mode==='text'){
     this.status=this.active||'Text descriptions are enabled.';
     return;
   }
   if(this.p.mode==='audio'){
     this.status='Recorded human narration is not yet available for this lesson. Use Spoken voice (TTS) or Text descriptions.';
     return;
   }
   if(!this.src||!this.audio){this.status='Recorded audio description is not available.';return;}
   if(this.media){this.wasPlaying=!this.media.paused;try{this.audio.currentTime=Math.max(0,this.media.currentTime-this.offsetMs/1000);}catch{}this.audio.playbackRate=this.media.playbackRate;}
   try{await this.audio.play();this.status='Audio description playing.';}catch{this.status='Press Play to start the description.';}
 }
 private stop(persist=true){
   if(typeof window!=='undefined'&&window.speechSynthesis)try{window.speechSynthesis.cancel();}catch{}
   this.lastSpokenCue=-1;
   this.audio?.pause();
   if(this.p.extended&&this.wasPlaying)void this.media?.play().catch(()=>{});
   this.wasPlaying=false;
   if(persist){this.p={...this.p,enabled:false};this.save();}
   this.status='Audio description stopped.';
 }
 private descriptionEnded=()=>{if(this.p.extended&&this.wasPlaying)void this.media?.play().catch(()=>{});this.wasPlaying=false;this.p={...this.p,enabled:false};this.save();this.status='Description finished.';};
 private extended(v:boolean){this.p={...this.p,extended:v};this.save();if(v&&this.audio&&!this.audio.paused){this.wasPlaying=!!this.media&&!this.media.paused;this.media?.pause();}}
 render(){
   const badge=this.p.enabled?html`<span class="ad-badge" role="status" aria-label="Audio description active">🔊 AD ON</span>`:html`<span class="ad-badge ad-badge-off" aria-label="Audio description off">AD OFF</span>`;
   return html`<div class="controls">${badge}<button type="button" aria-pressed=${String(this.p.enabled)} aria-label="Audio description ${this.p.enabled?'on':'off'}" @click=${()=>this.p.enabled?this.stop():void this.play()}>Audio description: ${this.p.enabled?'On':'Off'}</button><label>Mode <select .value=${this.p.mode} @change=${(e:Event)=>{this.p={...this.p,mode:(e.target as HTMLSelectElement).value};this.save();}}><option value="speech">Spoken voice (TTS)</option><option value="text">Text descriptions</option><option value="audio">Recorded audio</option></select></label><button @click=${this.play}>Play description</button><button @click=${this.stop}>Stop</button><label><input type="checkbox" .checked=${this.p.extended} @change=${(e:Event)=>this.extended((e.target as HTMLInputElement).checked)}> Extended AD (pause lesson)</label></div><audio preload="metadata" .src=${this.src} @play=${()=>{if(this.p.extended){this.wasPlaying=!!this.media&&!this.media.paused;this.media?.pause();}}} @ended=${this.descriptionEnded} @error=${()=>this.status='Recorded description failed to load.'}></audio><p role="status" aria-live="polite">${this.status}</p>`;
 }
}
