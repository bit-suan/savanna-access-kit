import test from 'node:test';
import assert from 'node:assert/strict';
import {DRIFT_THRESHOLD_SECONDS,needsDriftCorrection,signTargetTime} from './sync.ts';

type C2Detail={time:number;paused:boolean;rate:number};

class FakeC2Player extends EventTarget{
 media={currentTime:0,paused:true,playbackRate:1};
 update(detail:Partial<C2Detail>={}){if(typeof detail.time==='number')this.media.currentTime=detail.time;if(typeof detail.paused==='boolean')this.media.paused=detail.paused;if(typeof detail.rate==='number')this.media.playbackRate=detail.rate;this.dispatchEvent(new CustomEvent<C2Detail>('savanna:timeupdate',{detail:{time:this.media.currentTime,paused:this.media.paused,rate:this.media.playbackRate}}));}
}

test('fake C2 player keeps a sign probe below the 300ms correction threshold for five minutes',()=>{
 const player=new FakeC2Player();let signTime=0,rate=1,paused=true,corrections=0;
 player.addEventListener('savanna:timeupdate',event=>{const detail=(event as CustomEvent<C2Detail>).detail;const target=signTargetTime(detail.time,0);if(needsDriftCorrection(signTime,detail.time,0)){signTime=target;corrections++;}rate=detail.rate;paused=detail.paused;});
 for(let time=0;time<=300;time+=0.25){signTime=time+0.15;player.update({time,paused:false,rate:time<150?1:1.5});assert.ok(Math.abs(signTime-time)<0.2);}
 assert.equal(corrections,0);assert.equal(rate,1.5);assert.equal(paused,false);
});

test('fake C2 player corrects seeking and drift beyond 300ms',()=>{
 assert.equal(needsDriftCorrection(12.3,12,0),false);
 assert.equal(needsDriftCorrection(12.31,12,0),true);
 assert.equal(signTargetTime(2,2500),0);
 assert.equal(DRIFT_THRESHOLD_SECONDS,0.3);
});
