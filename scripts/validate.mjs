import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {gzipSync} from 'node:zlib';
import {questions} from '../dist/questions.js';
import {validateBank} from './bank-quality.mjs';
import {initialState,successProbability,updateElo,scheduleReview,adaptiveQuestions,dailyQuestions,buildTutorPayload,reviewAllowed,reconcileFreezes,streak,noteActivity,awardXp} from '../dist/learning.js';
import {createTutorEngine,TUTOR_SYSTEM_PROMPT} from '../dist/tutor-engine.js';

let checks=0;
function check(name,fn){fn();checks++;console.log(`PASS ${name}`);}
function answer(q){return q.choices[q.answer];}
function numbers(s,re){return [...s.matchAll(re)].map(m=>Number(m[1]));}
function expectedMath(q){const p=q.prompt;let m;if(q.verification){const v=q.verification;if(v.kind==='nonlinear-system'){const A=1,B=v.p-v.m,C=v.c-v.b,D=B*B-4*A*C;assert.ok(D>0);const x=(-B+Math.sqrt(D))/2;return v.m*x+v.b;}if(v.kind==='circle-distance'){const r=Math.sqrt(v.h*v.h+v.k*v.k-v.c);return Math.hypot(v.px-v.h,v.py-v.k)-r;}if(v.kind==='three-variable'){const matrix=[[1,1,1,v.t],[2,-1,1,v.u],[1,2,-1,v.v]];for(let j=0;j<3;j++){const pivot=matrix[j][j];for(let k=j;k<4;k++)matrix[j][k]/=pivot;for(let row=0;row<3;row++){if(row===j)continue;const factor=matrix[row][j];for(let k=j;k<4;k++)matrix[row][k]-=factor*matrix[j][k];}}return 2*matrix[0][3]+matrix[1][3]-matrix[2][3];}}
 switch(q.skill){
 case'Linear equations':m=p.match(/If (\d+)x \+ (\d+) = (\d+)/);return(Number(m[3])-Number(m[2]))/Number(m[1]);
 case'Systems of equations':m=p.match(/x \+ y = (\d+) and x − y = (\d+)/);return(Number(m[1])+Number(m[2]))/2;
 case'Linear functions':m=p.match(/f\(x\) = (\d+)x − (\d+).*f\((\d+)\)/);return Number(m[1])*Number(m[3])-Number(m[2]);
 case'Slope':m=[...p.matchAll(/\((\d+), (\d+)\)/g)];return(Number(m[1][2])-Number(m[0][2]))/(Number(m[1][1])-Number(m[0][1]));
 case'Linear inequalities':m=p.match(/(\d+)x − (\d+) > (\d+)/);return`x > ${(Number(m[3])+Number(m[2]))/Number(m[1])}`;
 case'Linear word problems':m=numbers(p,/\$(\d+)/g);return(m[2]-m[0])/m[1];
 case'Quadratic equations':return Math.min(...numbers(p,/\(x − (\d+)\)/g));
 case'Quadratic functions':return Number(p.match(/\)² \+ (\d+)/)[1]);
 case'Exponents':return numbers(p,/2\^(\d+)/g).reduce((a,b)=>a+b,0);
 case'Equivalent expressions':return`x + ${Math.sqrt(Number(p.match(/x² − (\d+)/)[1]))}`;
 case'Polynomial expressions':return numbers(p,/\(x \+ (\d+)\)/g).reduce((a,b)=>a+b,0);
 case'Absolute value':return 2*Number(p.match(/\|x − (\d+)\|/)[1]);
 case'Percentages':return Number(p.match(/\$(\d+)/)[1])*(1-Number(p.match(/by (\d+)%/)[1])/100);
 case'Statistics':m=numbers(p.split('What')[0],/(\d+)/g);return m.reduce((a,b)=>a+b,0)/m.length;
 case'Probability':m=p.match(/(\d+) red, (\d+) blue, and (\d+) green/);return`${m[1]}/${Number(m[1])+Number(m[2])+Number(m[3])}`;
 case'Ratios':return Number(p.match(/there are (\d+) plants/)[1])*3/5;
 case'Rates and units':m=p.match(/travels ([\d.]+) kilometers in (\d+) minutes/);return Number(m[1])*60/Number(m[2]);
 case'Right triangles':m=p.match(/length (\d+) and (\d+)/);return Math.hypot(Number(m[1]),Number(m[2]));
 case'Circles':return`${Number(p.match(/radius of (\d+)/)[1])**2}π`;
 case'Similar triangles':m=p.match(/length (\d+) and (\d+).*length (\d+) and x/);return Number(m[2])*Number(m[3])/Number(m[1]);
 default:throw Error('Unverified math family '+q.skill);
 }
}
check('500 valid items, 29 skills, 8 domains, no duplicated questions',()=>{assert.equal(questions.length,500);assert.equal(new Set(questions.map(q=>q.skill)).size,29);assert.equal(new Set(questions.map(q=>q.domain)).size,8);assert.deepEqual(validateBank(questions).failures,[]);});
check('All 300 math answer keys independently recomputed',()=>{let n=0;for(const q of questions.filter(q=>q.subject==='Math')){const expected=expectedMath(q);if(typeof expected==='number')assert.ok(Math.abs(Number(answer(q))-expected)<0.0001,`${q.id}: ${answer(q)} != ${expected}`);else assert.equal(answer(q),expected,q.id);n++;}assert.equal(n,300);});
check('Validator rejects duplicate options, duplicate stems, and single-step explanations',()=>{const q=questions[0];assert.ok(validateBank([{...q,choices:[q.choices[0],q.choices[0],q.choices[2],q.choices[3]]}]).failures.length);assert.ok(validateBank([q,{...q,id:'COPY'}]).failures.length);assert.ok(validateBank([{...q,workedSteps:['Only one explanation step.']}]).failures.length);});
check('ELO updates have the correct direction and assisted-response weight',()=>{const q=questions[0];assert.equal(successProbability(1000,1000),.5);for(const [correct,assisted,expected]of[[true,false,1012],[false,false,988],[true,true,1006]]){const s=initialState();s.itemRatings[q.id]=1000;updateElo(s,q,correct,assisted);assert.equal(s.skillRatings[q.skill],expected);} });
check('Adaptive sessions have no duplicates and prioritize a due item',()=>{const s=initialState();const now=Date.now();s.schedule[questions[50].id]={box:0,due:now-1000};const selected=adaptiveQuestions(questions,s,10,now);assert.equal(new Set(selected.map(q=>q.id)).size,10);assert.equal(selected[0].id,questions[50].id);});
check('Daily questions are stable, distinct, and span all domains',()=>{const a=dailyQuestions(questions,'2026-11-16'),b=dailyQuestions(questions,'2026-11-16'),c=dailyQuestions(questions,'2026-11-17');assert.deepEqual(a,b);assert.notDeepEqual(a,c);assert.equal(a.length,10);assert.equal(new Set(a.map(q=>q.skill)).size,10);assert.equal(new Set(a.map(q=>q.domain)).size,8);});
check('Every tutor payload is answer-free and every item supports three hint levels',()=>{for(const q of questions){const wrong=(q.answer+1)%4,payload=buildTutorPayload(q,wrong);assert.deepEqual(Object.keys(payload).sort(),['explanationSteps','question','studentIncorrectAnswer']);assert.deepEqual(Object.keys(payload.explanationSteps).sort(),['check','concept','firstStep']);assert.equal(payload.studentIncorrectAnswer,q.choices[wrong]);const tutor=createTutorEngine();for(let i=1;i<=3;i++){const h=tutor(payload);assert.equal(h.level,i);assert.ok(h.message.length>15);}assert.equal(tutor(payload).level,3);assert.throws(()=>buildTutorPayload(q,q.answer));}});
check('Tutor rejects extra fields and adapts diagnoses to selected mistakes',()=>{const q=questions.find(q=>q.skill==='Linear equations'),payload=buildTutorPayload(q,(q.answer+1)%4),tutor=createTutorEngine();assert.throws(()=>tutor({...payload,answer:q.answer}));tutor(payload);const second=tutor(payload);assert.match(second.message,/left side (larger|smaller)/);assert.match(TUTOR_SYSTEM_PROMPT,/two failed attempts/);const worker=readFileSync(new URL('../dist/tutor-worker.js',import.meta.url),'utf8');assert.ok(!worker.includes('questions.js'));assert.ok(!/fetch\s*\(/.test(worker));});
check('Full solution review is gated behind two failures',()=>{assert.equal(reviewAllowed(0),false);assert.equal(reviewAllowed(1),false);assert.equal(reviewAllowed(2),true);assert.equal(reviewAllowed(3),true);});
check('Spaced-review intervals advance and reset on mistakes',()=>{const s=initialState(),now=100000;for(const days of[1,3,7,14,30]){scheduleReview(s,'M001',true,now);assert.equal(s.schedule.M001.due,now+days*86400000);}scheduleReview(s,'M001',false,now);assert.equal(s.schedule.M001.box,0);assert.equal(s.schedule.M001.due,now);});
check('Streak freezes protect missed days without creating practice activity',()=>{const s=initialState();s.days=['2026-11-13'];assert.equal(reconcileFreezes(s,'2026-11-16'),2);assert.equal(s.freezes,0);assert.equal(s.days.length,1);assert.equal(streak(s,'2026-11-16'),3);noteActivity(s,'2026-11-16');assert.equal(streak(s,'2026-11-16'),4);const other=initialState();other.days=['2026-11-10'];assert.equal(reconcileFreezes(other,'2026-11-16'),0);assert.equal(streak(other,'2026-11-16'),0);});
check('XP and freeze regeneration have deterministic state updates',()=>{const s=initialState();s.freezes=0;for(let i=1;i<=7;i++)noteActivity(s,`2026-11-${String(i).padStart(2,'0')}`);assert.equal(s.freezes,1);noteActivity(s,'2026-11-07');assert.equal(s.freezes,1);awardXp(s,40,'daily',100);assert.equal(s.xp,40);assert.equal(s.xpEvents[0].amount,40);});
check('PWA assets, icons, service worker modules, and documentation exist',()=>{const manifest=JSON.parse(readFileSync(new URL('../dist/manifest.json',import.meta.url)));assert.equal(manifest.display,'standalone');assert.equal(manifest.start_url,'/');for(const i of manifest.icons)assert.ok(existsSync(new URL('../dist'+i.src,import.meta.url)));const sw=readFileSync(new URL('../dist/sw.js',import.meta.url),'utf8');const assets=JSON.parse(sw.match(/const ASSETS=(\[[\s\S]*?\]);/)[1].replaceAll("'",'"'));for(const asset of assets)assert.ok(existsSync(new URL('../dist'+(asset==='/'?'/index.html':asset),import.meta.url)),asset);});
check('Stats match the generated bank and report both explanation units',()=>{const stats=JSON.parse(readFileSync(new URL('../stats.json',import.meta.url)));assert.equal(stats.totalQuestions,500);assert.equal(stats.totalSkills,29);assert.equal(stats.subjects.Math,300);const chars=questions.reduce((n,q)=>n+q.workedSteps.join(' ').length,0)/500;assert.equal(stats.averageExplanationLength.characters,Number(chars.toFixed(1)));assert.equal(readFileSync(new URL('../stats.json',import.meta.url),'utf8'),readFileSync(new URL('../dist/stats.json',import.meta.url),'utf8'));});
check('The full bank stays small enough for fast compressed loading',()=>{const bytes=gzipSync(readFileSync(new URL('../dist/questions.js',import.meta.url))).length;assert.ok(bytes<190000,`${bytes} compressed bytes`);console.log(`  Bank transfer size: ${(bytes/1024).toFixed(1)} KiB with gzip.`);});
console.log(`\n${checks} validation groups passed.`);
