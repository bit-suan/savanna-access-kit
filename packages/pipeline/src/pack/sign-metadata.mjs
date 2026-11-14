#!/usr/bin/env node
import fs from 'node:fs/promises';import {spawn} from 'node:child_process';import path from 'node:path';
const a=k=>{const i=process.argv.indexOf('--'+k);return i<0?null:process.argv[i+1];};
const probe=f=>new Promise((ok,no)=>{const p=spawn('ffprobe',['-v','error','-show_entries','format=duration','-of','default=noprint_wrappers=1:nokey=1',f]);let s='';p.stdout.on('data',d=>s+=d);p.on('error',no);p.on('close',c=>c===0?ok(Number(s.trim())):no(Error('ffprobe failed'));});
const lesson=path.resolve(a('lesson')||''),sign=path.resolve(a('sign')||''),offset=Number(a('offset-ms')||0),out=path.resolve(a('output')||'sign-track.json');if(!a('lesson')||!a('sign')||offset<0)throw Error('Use --lesson --sign --offset-ms');
const [ld,sd]=await Promise.all([probe(lesson),probe(sign)]);if(sd+.25<ld)console.warn('Sign track is shorter than lesson.');
await fs.writeFile(out,JSON.stringify({url:path.basename(sign),offsetMs:offset,durationMs:Math.round(sd*1000),lessonDurationMs:Math.round(ld*1000),source:'human-interpreted',approved:false},null,2));console.log('Metadata created; human review/approval required.');
