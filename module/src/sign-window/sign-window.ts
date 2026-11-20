import {LitElement,css,html} from 'lit';
import {customElement,property,state} from 'lit/decorators.js';
import {needsDriftCorrection,signTargetTime} from './sync.js';

type Position={x:number;y:number;width:number;height:number;corner?:Corner};
type Corner='nw'|'ne'|'se'|'sw';
type Bounds={left:number;top:number;right:number;bottom:number};
const KEY='savanna.prefs.v1',RATIO=16/9,HEADER=42,MIN_WIDTH=180,GUTTER=8,CONTROL_CLEARANCE=56;
const DEFAULT:Position={x:8,y:8,width:320,height:320/RATIO+HEADER};

function number(value:unknown,fallback:number){return typeof value==='number'&&Number.isFinite(value)?value:fallback;}
function storedPosition():Position|undefined{try{const sign=JSON.parse(localStorage.getItem(KEY)||'{}')?.sign;if(!sign||typeof sign!=='object'||Array.isArray(sign))return undefined;const corner=['nw','ne','se','sw'].includes((sign as Position).corner||'')?(sign as Position).corner:undefined;return{x:number((sign as Position).x,DEFAULT.x),y:number((sign as Position).y,DEFAULT.y),width:number((sign as Position).width,DEFAULT.width),height:number((sign as Position).height,DEFAULT.height),corner};}catch{return undefined;}}
function read():Position{return {...DEFAULT,...storedPosition()};}
function storedEnabled(){try{const enabled=JSON.parse(localStorage.getItem(KEY)||'{}')?.sign?.enabled;return typeof enabled==='boolean'?enabled:undefined;}catch{return undefined;}}
function save(position:Position,enabled?:boolean){try{const raw=JSON.parse(localStorage.getItem(KEY)||'{}'),prefs=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{},previous=prefs.sign&&typeof prefs.sign==='object'?prefs.sign:{};prefs.sign={...position,...(typeof enabled==='boolean'?{enabled}:typeof previous.enabled==='boolean'?{enabled:previous.enabled}:{})};localStorage.setItem(KEY,JSON.stringify(prefs));}catch{}}

@customElement('savanna-sign-window')
export class SavannaSignWindow extends LitElement{
 static styles=css`
  :host{position:absolute;z-index:20;display:block;width:var(--panel-width,320px);max-width:calc(100% - 16px);color:#fff;font:14px/1.4 var(--savanna-font,system-ui,sans-serif)}:host(:not([enabled])){width:auto;max-width:none}
  section{position:relative;overflow:hidden;background:rgba(15,23,42,0.92);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,0.18);border-radius:10px;box-shadow:0 12px 36px -4px rgba(0,0,0,0.65),0 0 0 1px rgba(255,255,255,0.08);transition:border-color .2s,box-shadow .2s}
  section:has(header:focus-visible){border-color:var(--savanna-focus,#ffbf47);box-shadow:0 0 0 3px var(--savanna-focus,#ffbf47),0 12px 36px rgba(0,0,0,0.7)}
  section:has(header:active){border-color:#fff;box-shadow:0 0 0 2px #fff,0 12px 36px rgba(0,0,0,0.7)}
  header{display:flex;min-height:42px;align-items:center;justify-content:space-between;gap:8px;padding:0 8px 0 12px;background:rgba(30,41,59,0.85);border-bottom:1px solid rgba(255,255,255,0.1);touch-action:none;cursor:grab;user-select:none}
  header:active{cursor:grabbing;background:rgba(51,65,85,0.95)}
  header:focus-visible{outline:none} strong{font-size:13px;font-weight:700;color:#f8fafc;letter-spacing:0.2px;white-space:nowrap}.actions{display:inline-flex;align-items:center;gap:3px}
  .actions button{display:grid;min-width:26px;width:26px;min-height:26px;height:26px;place-items:center;border:1px solid rgba(255,255,255,0.18);border-radius:4px;background:rgba(255,255,255,0.08);color:#cbd5e1;font-size:11px;line-height:1;cursor:pointer;transition:all .15s ease}
  .actions button:hover{background:rgba(255,255,255,0.22);color:#fff;border-color:rgba(255,255,255,0.35)}
  .actions button:focus-visible{outline:2px solid var(--savanna-focus,#ffbf47);outline-offset:1px}
  .toggle{min-width:48px;height:26px;min-height:26px;padding:0 8px;font-size:11px;font-weight:800;border-radius:4px;border:1px solid rgba(245,163,0,0.5);background:#f5a300;color:#0f172a;cursor:pointer;transition:all .15s ease}
  .toggle:hover{background:#ffb733}
  .toggle[aria-pressed="false"]{background:rgba(255,255,255,0.12);color:#94a3b8;border-color:rgba(255,255,255,0.2)}
  video{display:block;width:100%;aspect-ratio:16/9;object-fit:contain;background:#000}.fallback{display:grid;min-height:180px;place-items:center;padding:16px;text-align:center;color:#f8fafc;background:#0f172a}.loading{position:absolute;inset:42px 0 0;min-height:0;background:rgba(15,23,42,0.85)}.sr-only{position:absolute;width:1px;height:1px;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap}
  .handle{position:absolute;z-index:2;touch-action:none}
  .handle.nw,.handle.ne,.handle.sw{display:none !important}
  .handle.se{display:block;right:3px;bottom:3px;width:18px;min-width:18px;height:18px;min-height:18px;padding:0;border:none;background:transparent;cursor:nwse-resize;opacity:0.6;transition:opacity .15s,transform .15s}
  .handle.se::after{content:'';position:absolute;right:3px;bottom:3px;width:8px;height:8px;border-right:2px solid rgba(255,255,255,0.7);border-bottom:2px solid rgba(255,255,255,0.7);border-radius:1px}
  .handle.se:hover{opacity:1;transform:scale(1.15)}
  .handle.se:hover::after{border-color:#f5a300}
  @media (max-width:600px){:host{max-width:calc(100% - 12px)}header{min-height:40px;padding-left:8px}.actions button{min-width:28px;min-height:28px}.toggle{min-width:52px}.fallback{min-height:120px}}
 `;

 @property() src='';
 @property({type:Number,attribute:'offset-ms'}) offsetMs=0;
 @property() lang='';
 @property({type:Boolean,reflect:true}) enabled=storedEnabled()??true;
 @state() private position=read();
 @state() private hasTrack=true;
 @state() private signUnavailable=false;
 @state() private loading=false;
 @state() private announcement='';
 private hasStoredPosition=!!storedPosition();
 private player?:HTMLElement;
 private main?:HTMLMediaElement;
 private video?:HTMLVideoElement;
 private drag?:{x:number;y:number;position:Position};
 private resize?:{x:number;y:number;position:Position;corner:Corner};
 private buffering=false;

 connectedCallback(){
  super.connectedCallback();
  if(!this.slot)this.slot='overlay';
  this.player=this.closest('savanna-player') as HTMLElement|undefined;
  this.main=(this.player as {media?:HTMLMediaElement}|undefined)?.media;
  this.hasTrack=!!this.src;
  window.addEventListener('resize',this.clamp);
  window.addEventListener('savanna:lang-change',this.language);
  this.player?.addEventListener('savanna:timeupdate',this.sync as EventListener);
  this.main?.addEventListener('waiting',this.mainWaiting);
  this.main?.addEventListener('seeking',this.mainWaiting);
  this.main?.addEventListener('canplay',this.mainReady);
  this.main?.addEventListener('seeked',this.mainReady);
  this.main?.addEventListener('playing',this.mainReady);
  this.main?.addEventListener('ended',this.syncFromMain);
  this.main?.addEventListener('pause',this.syncFromMain);
  this.main?.addEventListener('ratechange',this.syncFromMain);
 }
 disconnectedCallback(){
  window.removeEventListener('resize',this.clamp);
  window.removeEventListener('savanna:lang-change',this.language);
  this.player?.removeEventListener('savanna:timeupdate',this.sync as EventListener);
  this.main?.removeEventListener('waiting',this.mainWaiting);
  this.main?.removeEventListener('seeking',this.mainWaiting);
  this.main?.removeEventListener('canplay',this.mainReady);
  this.main?.removeEventListener('seeked',this.mainReady);
  this.main?.removeEventListener('playing',this.mainReady);
  this.main?.removeEventListener('ended',this.syncFromMain);
  this.main?.removeEventListener('pause',this.syncFromMain);
  this.main?.removeEventListener('ratechange',this.syncFromMain);
  super.disconnectedCallback();
 }
 firstUpdated(){
  this.video=this.renderRoot.querySelector('video')||undefined;
  if(this.video) this.video.muted = true;
  if(!this.hasStoredPosition){const bounds=this.bounds();this.position={...this.position,x:bounds.right-this.position.width,y:bounds.top};}
  this.clamp();
 }
 updated(changed:Map<string,unknown>){
  if(changed.has('src')){this.hasTrack=!!this.src;this.signUnavailable=false;this.loading=!!this.src;this.video=this.renderRoot.querySelector('video')||undefined;if(this.video)this.video.muted=true;}
  if(changed.has('enabled')){this.video=this.renderRoot.querySelector('video')||undefined;if(this.video)this.video.muted=true;if(this.enabled)this.syncFromMain();}
 }
 private bounds():Bounds{
  const parent=this.offsetParent as HTMLElement|null;
  if(!parent)return{left:GUTTER,top:GUTTER,right:innerWidth-GUTTER,bottom:innerHeight-CONTROL_CLEARANCE};
  const rect=parent.getBoundingClientRect(),viewport=window.visualViewport;
  const left=Math.max(rect.left,viewport?.offsetLeft||0),top=Math.max(rect.top,viewport?.offsetTop||0);
  const right=Math.min(rect.right,(viewport?.offsetLeft||0)+(viewport?.width||innerWidth));
  const bottom=Math.min(rect.bottom,(viewport?.offsetTop||0)+(viewport?.height||innerHeight));
  return{left:Math.max(GUTTER,left-rect.left+GUTTER),top:Math.max(GUTTER,top-rect.top+GUTTER),right:Math.max(GUTTER,right-rect.left-GUTTER),bottom:Math.max(GUTTER,bottom-rect.top-CONTROL_CLEARANCE)};
 }
 private fit(position:Position):Position{
  const bounds=this.bounds(),availableWidth=Math.max(1,bounds.right-bounds.left),availableHeight=Math.max(1,bounds.bottom-bounds.top);
  const maximum=Math.max(1,Math.min(availableWidth,(availableHeight-HEADER)*RATIO));
  const minimum=Math.min(MIN_WIDTH,maximum);
  const width=Math.max(minimum,Math.min(position.width,maximum));
  const height=width/RATIO+HEADER;
  return{width,height,x:Math.max(bounds.left,Math.min(position.x,bounds.right-width)),y:Math.max(bounds.top,Math.min(position.y,bounds.bottom-height)),corner:position.corner};
 }
 private apply(position:Position,persist=true){this.position=this.fit(position);if(persist)save(this.position);this.style.setProperty('--panel-width',this.position.width+'px');this.style.left=`${this.position.x}px`;this.style.top=`${this.position.y}px`;}
 private clamp=()=>this.apply(this.position);
 private language=(event:Event)=>{const lang=(event as CustomEvent<{lang?:string}>).detail?.lang;if(lang)this.lang=lang;};
 private sync=(event:Event)=>{
  const detail=(event as CustomEvent<{time?:number;paused?:boolean;rate?:number}>).detail;
  if(typeof detail?.time==='number')this.syncTo(detail.time,!!detail.paused,detail.rate||1);
 };
 private syncFromMain=()=>{if(this.main)this.syncTo(this.main.currentTime,this.main.paused,this.main.playbackRate||1);};
 private mainWaiting=()=>{this.buffering=true;this.video?.pause();};
 private mainReady=()=>{this.buffering=false;this.syncFromMain();};
 private syncTo(time:number,paused:boolean,rate:number){
  if(!this.enabled||!this.video||!this.hasTrack||this.signUnavailable)return;
  const target=signTargetTime(time,this.offsetMs);
  const dur=this.video.duration;
  const effectiveTarget=(dur&&dur>0&&target>=dur)?(target%dur):target;
  if(needsDriftCorrection(this.video.currentTime,effectiveTarget,0))try{this.video.currentTime=effectiveTarget;}catch{}
  if(this.video.playbackRate!==rate)this.video.playbackRate=rate;
  if(paused||this.buffering)this.video.pause();else if(this.video.paused)void this.video.play().catch(()=>{});
 }
 private signReady=()=>{this.loading=false;this.syncFromMain();};
 private signError=()=>{this.loading=false;this.signUnavailable=true;this.announcement='Sign language interpretation could not be loaded for this lesson.';};
 private announce(action:string){this.announcement=`${action}. Position ${Math.round(this.position.x)}, ${Math.round(this.position.y)}. Size ${Math.round(this.position.width)} by ${Math.round(this.position.height)} pixels.`;}
 private move(dx:number,dy:number,announce=true){this.apply({...this.position,x:this.position.x+dx,y:this.position.y+dy,corner:undefined});this.dispatchEvent(new CustomEvent('savanna:sign-position',{bubbles:true,composed:true,detail:this.position}));if(announce)this.announce('Sign window moved');}
 private resizeBy(dx:number,dy:number,announce=true){const delta=Math.abs(dx)>=Math.abs(dy*RATIO)?dx:dy*RATIO;this.apply({...this.position,width:this.position.width+delta,corner:undefined});if(announce)this.announce('Sign window resized');}
 private startDrag(event:PointerEvent){
  if((event.target as HTMLElement).closest('button'))return;
  (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  this.drag={x:event.clientX,y:event.clientY,position:this.position};
 }
 private dragMove(event:PointerEvent){if(this.drag){this.apply({...this.drag.position,x:this.drag.position.x+event.clientX-this.drag.x,y:this.drag.position.y+event.clientY-this.drag.y,corner:undefined});this.dispatchEvent(new CustomEvent('savanna:sign-position',{bubbles:true,composed:true,detail:this.position}));}}
 private endDrag(){if(this.drag)this.announce('Sign window moved');this.drag=undefined;}
 private startResize(event:PointerEvent,corner:Corner){
  (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  this.resize={x:event.clientX,y:event.clientY,position:this.position,corner};
 }
 private resizeMove(event:PointerEvent){
  if(!this.resize)return;
  const {corner,position,x,y}=this.resize,dx=event.clientX-x,dy=event.clientY-y;
  const horizontal=corner.includes('w')?-dx:dx,vertical=(corner.includes('n')?-dy:dy)*RATIO;
  const width=position.width+(Math.abs(horizontal)>=Math.abs(vertical)?horizontal:vertical);
  const height=width/RATIO+HEADER;
  this.apply({width,height,x:corner.includes('w')?position.x+position.width-width:position.x,y:corner.includes('n')?position.y+position.height-height:position.y});
 }
 private endResize(){if(this.resize)this.announce('Sign window resized');this.resize=undefined;}
 private snap(corner:Corner){const bounds=this.bounds(),width=this.position.width,height=this.position.height;this.apply({...this.position,corner,x:corner.includes('e')?bounds.right-width:bounds.left,y:corner.includes('s')?bounds.bottom-height:bounds.top});this.announce(`Sign window snapped to the ${corner==='nw'?'top left':corner==='ne'?'top right':corner==='se'?'bottom right':'bottom left'} corner`);}
 private toggle(){this.enabled=!this.enabled;if(!this.enabled)this.video?.pause();save(this.position,this.enabled);this.announcement=`Sign language ${this.enabled?'enabled':'disabled'}.`;this.dispatchEvent(new CustomEvent('savanna:sign-toggle',{bubbles:true,composed:true,detail:{enabled:this.enabled}}));}
 render(){
  const label=this.lang==='am'?'የምልክት ቋንቋ':'Sign language';
  const fallback=this.lang==='am'?'ለዚህ ትምህርት የምልክት ቪዲዮ የለም':'Sign language interpretation is not available for this lesson.';
  const handles=(['nw','ne','se','sw'] as Corner[]).map(corner=>html`<button class="handle ${corner}" aria-label="Resize sign window from ${corner} corner" @pointerdown=${(event:PointerEvent)=>this.startResize(event,corner)} @pointermove=${this.resizeMove} @pointerup=${this.endResize} @pointercancel=${this.endResize}></button>`);
  const snaps=(['nw','ne','sw','se'] as Corner[]).map(corner=>html`<button @click=${()=>this.snap(corner)} aria-label="Snap sign window to ${corner==='nw'?'top left':corner==='ne'?'top right':corner==='sw'?'bottom left':'bottom right'}">${corner==='nw'?'↖':corner==='ne'?'↗':corner==='sw'?'↙':'↘'}</button>`);
  const keyboard=(e:KeyboardEvent)=>{if(!e.key.startsWith('Arrow'))return;e.preventDefault();const step=e.shiftKey?100:20;const horizontal=e.key==='ArrowRight'?step:e.key==='ArrowLeft'?-step:0;const right=horizontal;const down=e.key==='ArrowDown'?step:e.key==='ArrowUp'?-step:0;if(e.altKey)this.resizeBy(right,down); // Alt + arrow resizes.
  else this.move(right,down);};
  const toggle=html`<button class="toggle" type="button" aria-label="${label}: ${this.enabled?'on':'off'}" aria-pressed=${String(this.enabled)} @click=${this.toggle}>${this.enabled?'On':'Off'}</button>`;
  return html`<p class="sr-only" role="status" aria-live="polite">${this.announcement}</p>${this.enabled?html`<section aria-label="${label} window"><header tabindex="0" role="group" aria-label="${label} window. Use arrow keys to move, Shift plus arrow keys for larger moves, and Alt plus arrow keys to resize." @keydown=${keyboard} aria-keyshortcuts="ArrowUp ArrowDown ArrowLeft ArrowRight Shift+ArrowUp Shift+ArrowDown Alt+ArrowUp Alt+ArrowDown" @pointerdown=${this.startDrag} @pointermove=${this.dragMove} @pointerup=${this.endDrag} @pointercancel=${this.endDrag}><strong>${label}</strong><span class="actions">${snaps}${toggle}</span></header>${this.hasTrack&&!this.signUnavailable?html`<video .src=${this.src} playsinline muted preload="metadata" loop aria-label="${label} interpreter video" @loadedmetadata=${this.signReady} @error=${this.signError}></video>${this.loading?html`<div class="fallback loading" role="status">Loading sign-language interpretation…</div>`:''}`:html`<div class="fallback" role="status">${fallback}</div>`}${handles}</section>`:toggle}`;
 }
}
