import {LitElement,css,html} from 'lit';
import {customElement,property,state} from 'lit/decorators.js';
import {needsDriftCorrection,signTargetTime} from './sync.js';

type Position={x:number;y:number;width:number;height:number;corner?:Corner};
type Corner='nw'|'ne'|'se'|'sw';
type Bounds={left:number;top:number;right:number;bottom:number};
const KEY='savanna.prefs.v1',RATIO=16/9,HEADER=48,MIN_WIDTH=180,GUTTER=8,CONTROL_CLEARANCE=56;
const DEFAULT:Position={x:8,y:8,width:320,height:320/RATIO+HEADER};

function number(value:unknown,fallback:number){return typeof value==='number'&&Number.isFinite(value)?value:fallback;}
function storedPosition():Position|undefined{try{const sign=JSON.parse(localStorage.getItem(KEY)||'{}')?.sign;if(!sign||typeof sign!=='object'||Array.isArray(sign))return undefined;const corner=['nw','ne','se','sw'].includes((sign as Position).corner||'')?(sign as Position).corner:undefined;return{x:number((sign as Position).x,DEFAULT.x),y:number((sign as Position).y,DEFAULT.y),width:number((sign as Position).width,DEFAULT.width),height:number((sign as Position).height,DEFAULT.height),corner};}catch{return undefined;}}
function read():Position{return {...DEFAULT,...storedPosition()};}
function storedEnabled(){try{const enabled=JSON.parse(localStorage.getItem(KEY)||'{}')?.sign?.enabled;return typeof enabled==='boolean'?enabled:undefined;}catch{return undefined;}}
function save(position:Position,enabled?:boolean){try{const raw=JSON.parse(localStorage.getItem(KEY)||'{}'),prefs=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{},previous=prefs.sign&&typeof prefs.sign==='object'?prefs.sign:{};prefs.sign={...position,...(typeof enabled==='boolean'?{enabled}:typeof previous.enabled==='boolean'?{enabled:previous.enabled}:{})};localStorage.setItem(KEY,JSON.stringify(prefs));}catch{}}

@customElement('savanna-sign-window')
export class SavannaSignWindow extends LitElement{
 static styles=css`
  :host{position:absolute;z-index:20;display:block;width:var(--panel-width,320px);max-width:calc(100% - 16px);color:#fff;font:16px/1.4 var(--savanna-font,system-ui,sans-serif)}:host(:not([enabled])){width:auto;max-width:none}
  section{position:relative;overflow:hidden;background:#16131a;border:1px solid #ffffff73;border-radius:var(--savanna-radius,8px);box-shadow:0 8px 24px #0009}
  header{display:flex;min-height:48px;align-items:center;justify-content:space-between;gap:8px;padding:0 6px 0 12px;background:#27202d;touch-action:none;cursor:grab;user-select:none}
  header:active{cursor:grabbing} strong{font-size:14px}.actions{display:flex;gap:4px}button{display:grid;min-width:36px;min-height:36px;place-items:center;border:1px solid #ffffff66;border-radius:5px;background:#3d3049;color:#fff;font:inherit;cursor:pointer}button:hover{background:#594267}button:focus-visible{outline:3px solid var(--savanna-focus,#ffbf47);outline-offset:2px}.toggle{min-width:68px;padding:0 10px;font-size:13px;font-weight:700}.toggle[aria-pressed="true"]{background:var(--savanna-accent,#6e4a8e)}
  video{display:block;width:100%;aspect-ratio:16/9;object-fit:contain;background:#08070a}.fallback{display:grid;min-height:180px;place-items:center;padding:16px;text-align:center;color:#f4eef8;background:#18151c}.loading{position:absolute;inset:48px 0 0;min-height:0;background:#18151ccc}.sr-only{position:absolute;width:1px;height:1px;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap}
  .handle{position:absolute;z-index:1;width:20px;min-width:20px;height:20px;min-height:20px;padding:0;border:2px solid #fff;border-radius:4px;background:var(--savanna-accent,#6e4a8e);touch-action:none}.nw{top:4px;left:4px;cursor:nwse-resize}.ne{top:4px;right:4px;cursor:nesw-resize}.se{right:4px;bottom:4px;cursor:nwse-resize}.sw{bottom:4px;left:4px;cursor:nesw-resize}
  @media (max-width:600px){:host{max-width:calc(100% - 12px)}header{min-height:44px;padding-left:10px}button{min-width:40px;min-height:40px}.toggle{min-width:72px}.handle{width:24px;min-width:24px;height:24px;min-height:24px}.fallback{min-height:120px}}
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
  if(!this.hasStoredPosition){const bounds=this.bounds();this.position={...this.position,x:bounds.right-this.position.width,y:bounds.top};}
  this.clamp();
 }
 updated(changed:Map<string,unknown>){
  if(changed.has('src')){this.hasTrack=!!this.src;this.signUnavailable=false;this.loading=!!this.src;this.video=this.renderRoot.querySelector('video')||undefined;}
  if(changed.has('enabled')){this.video=this.renderRoot.querySelector('video')||undefined;if(this.enabled)this.syncFromMain();}
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
 private apply(position:Position,persist=true){this.position=this.fit(position);if(persist)save(this.position);this.style.setProperty('--panel-width',this.position.width+'px');}
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
  if(needsDriftCorrection(this.video.currentTime,time,this.offsetMs))try{this.video.currentTime=target;}catch{}
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
  return html`<p class="sr-only" role="status" aria-live="polite">${this.announcement}</p>${this.enabled?html`<section aria-label="${label} window"><header tabindex="0" role="group" aria-label="${label} window. Use arrow keys to move, Shift plus arrow keys for larger moves, and Alt plus arrow keys to resize." @keydown=${keyboard} aria-keyshortcuts="ArrowUp ArrowDown ArrowLeft ArrowRight Shift+ArrowUp Shift+ArrowDown Alt+ArrowUp Alt+ArrowDown" @pointerdown=${this.startDrag} @pointermove=${this.dragMove} @pointerup=${this.endDrag} @pointercancel=${this.endDrag}><strong>${label}</strong><span class="actions">${snaps}${toggle}</span></header>${this.hasTrack&&!this.signUnavailable?html`<video .src=${this.src} playsinline muted preload="metadata" aria-label="${label} interpreter video" @loadedmetadata=${this.signReady} @error=${this.signError}></video>${this.loading?html`<div class="fallback loading" role="status">Loading sign-language interpretation…</div>`:''}`:html`<div class="fallback" role="status">${fallback}</div>`}${handles}</section>`:toggle}`;
 }
}
