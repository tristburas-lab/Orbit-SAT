// Optional DOM integration checks. Install jsdom as a development-only dependency.
// ORBIT_DOM_TEST_PACKAGE can point to an existing jsdom module for managed QA.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createTutorEngine} from '../dist/tutor-engine.js';
import {questions} from '../dist/questions.js';
import {STORAGE_KEY,dateKey} from '../dist/learning.js';
const {JSDOM}=await import(process.env.ORBIT_DOM_TEST_PACKAGE||'jsdom');
const html=readFileSync(new URL('../dist/index.html',import.meta.url),'utf8');
const dom=new JSDOM(html,{url:'https://orbit.example/',pretendToBeVisual:true});
const window=dom.window;
for(const name of['window','document','location','navigator','localStorage','FormData'])Object.defineProperty(globalThis,name,{value:name==='window'?window:window[name],configurable:true,writable:true});
globalThis.requestAnimationFrame=fn=>fn();
window.scrollTo=()=>{};window.HTMLElement.prototype.scrollIntoView=()=>{};
window.HTMLCanvasElement.prototype.getContext=()=>new Proxy({createRadialGradient:()=>({addColorStop(){}})},{get:(target,key)=>target[key]??(()=>{})});
let copied='';Object.defineProperty(navigator,'clipboard',{value:{async writeText(text){copied=text;}},configurable:true});
class TestWorker{constructor(url=''){this.engine=createTutorEngine({teach:url.includes('mode=teach')});}postMessage(payload){queueMicrotask(()=>this.onmessage?.({data:{ok:true,hint:this.engine(payload)}}));}}
globalThis.Worker=TestWorker;
const intervalCallbacks=[];const originalInterval=globalThis.setInterval;globalThis.setInterval=(fn,ms)=>{intervalCallbacks.push(fn);return originalInterval(fn,ms);};
const flush=()=>new Promise(resolve=>setTimeout(resolve,0));
const $=s=>document.querySelector(s);
const click=(action,extra='')=>{const node=$(`[data-action="${action}"]${extra}`);assert.ok(node,`Missing action ${action}${extra}`);assert.ok(!node.disabled,`Disabled action ${action}`);node.dispatchEvent(new window.MouseEvent('click',{bubbles:true}));};
const change=(node,value)=>{node.value=value;node.dispatchEvent(new window.Event('change',{bubbles:true}));};
const input=(node,value)=>{node.value=value;node.dispatchEvent(new window.Event('input',{bubbles:true}));};
const readState=()=>JSON.parse(localStorage.getItem(STORAGE_KEY));
const currentQuestion=()=>{const id=$('.practice-question-meta>span').textContent.match(/[MRH]\d{3}/)[0];return questions.find(q=>q.id===id);};
const choose=index=>change($(`input[name="answer"][value="${index}"]`),String(index));
async function nav(page){location.hash=page;await flush();await flush();assert.equal($('.breadcrumb strong').textContent,({home:'Overview',bank:'Question bank',cards:'Flashcards',challenges:'Challenges',coach:'Orbit tutor',progress:'Your progress',leaderboard:'Leaderboard',science:'The study lab'})[page]);}
await import(new URL('../dist/app.js',import.meta.url));
if($('#onboard-form')){$('#onboard-form input[name=name]').value='Alex';$('#onboard-form').dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true}));}
assert.match($('h1').textContent,/Stellar scores/);
await nav('bank');input($('#bank-search'),'M001');assert.equal(document.querySelectorAll('.question-row').length,1);click('bookmark');assert.deepEqual(readState().bookmarks,['M001']);click('clear-filters');click('filter-subject','[data-subject="Reading & Writing"]');assert.match($('.bank-result-toolbar').textContent,/200 questions/);
console.log('PASS navigation, 500-item search/filtering, and persistent bookmarks');

await nav('home');click('daily');let q=currentQuestion();choose((q.answer+1)%4);click('submit-answer');assert.equal($('.solution-review'),null);assert.equal($('.review-solution-button'),null);assert.equal($('.correct-option'),null);click('practice-hint');await flush();assert.match($('.practice-hint').textContent,/LEVEL 1/);click('practice-hint');await flush();assert.match($('.practice-tutor').textContent,/LEVEL 2/);choose((q.answer+2)%4);click('submit-answer');assert.ok($('.review-solution-button'));assert.equal($('.solution-review'),null);click('review-solution');assert.ok($('.solution-review'));click('next-question');
for(let i=1;i<10;i++){q=currentQuestion();choose(q.answer);click('submit-answer');assert.equal($('.solution-review'),null,'First-try success must not open the full worked review');click('next-question');}
assert.ok($('#results-canvas'));let s=readState();assert.equal(s.sessions.length,1);assert.equal(s.sessions[0].firstTry,9);assert.equal(s.sessions[0].attempted,10);assert.equal(s.sessions[0].xp,370);assert.ok(s.dailyAwards.includes(dateKey()));assert.equal(s.log.length,11);assert.ok($('#level-up'));click('copy-challenge');await flush();const ids=new URL(copied).searchParams.get('challenge').split('.');assert.equal(ids.length,10);assert.equal(new Set(ids).size,10);click('close-modal');
console.log('PASS two-failure gate, adaptive hints, double XP, level-up, game card, and same-set links');

await nav('progress');assert.equal(document.querySelectorAll('tbody tr').length,11);click('history-tab','[data-tab="sessions"]');assert.equal(document.querySelectorAll('.history-panel .session-row').length,1);await nav('leaderboard');assert.match($('.board-notice').textContent,/local demo/);assert.equal(document.querySelectorAll('.you-row').length,1);
console.log('PASS complete attempt/session history and explicitly labeled local leaderboard');

// Create four more real missed questions so the boss unlock is tested from actual history.
for(let i=0;i<4;i++){await nav('bank');if($('[data-action="clear-filters"]'))click('clear-filters');const target=questions.find(q=>!readState().answers[q.id]?.failedAttempts);input($('#bank-search'),target.id);click('open-question');choose((target.answer+1)%4);click('submit-answer');choose((target.answer+2)%4);click('submit-answer');click('review-solution');click('next-question');click('close-modal');}
await nav('challenges');click('boss');for(let i=0;i<5;i++){q=currentQuestion();assert.ok(readState().answers[q.id].failedAttempts>0);choose(q.answer);click('submit-answer');click('next-question');}s=readState();assert.equal(s.sessions.at(-1).mode,'boss');assert.equal(s.sessions.at(-1).correct,5);assert.equal(s.sessions.at(-1).bonus,75);click('close-modal');
console.log('PASS Boss Fight unlock, five actual previous misses, and clear bonus');

await nav('cards');const before=readState().xp;for(let i=0;i<3;i++){click('flip-card');click('review-card','[data-result="got"]');}s=readState();assert.equal(s.reviews.length,3);assert.equal(s.xp-before,45);assert.ok(s.dailyAwards.includes('cards-'+dateKey()));assert.ok(Object.values(s.schedule).some(x=>x.due>Date.now()));
console.log('PASS spaced flashcard review and distinct-card daily quest');

click('settings');$('#settings-form input[name="name"]').value='Voyager';$('#settings-form select[name="goal"]').value='1600';$('#settings-form').dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true}));assert.equal(readState().name,'Voyager');assert.equal(readState().goal,1600);await nav('home');click('practice');q=currentQuestion();document.dispatchEvent(new window.KeyboardEvent('keydown',{key:String((q.answer+1)%4+1),bubbles:true}));document.dispatchEvent(new window.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));assert.equal(readState().log.at(-1).correct,false);assert.equal($('.solution-review'),null);document.dispatchEvent(new window.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert.ok($('#results-canvas'));click('close-modal');
await nav('coach');click('coach-plan');assert.match($('#chat-messages').textContent,/lowest local skill ratings/);click('coach-hint');await flush();assert.ok($('.chat-message.assistant .hint-level'));await nav('science');assert.equal(document.querySelectorAll('.science-card').length,4);
console.log('PASS settings persistence, keyboard controls, study plan, tutor history, and research citations');
await nav('challenges');click('sprint');q=currentQuestion();choose(q.answer);click('submit-answer');const actualNow=Date.now;const later=actualNow()+601000;Date.now=()=>later;intervalCallbacks.at(-1)();Date.now=actualNow;assert.equal(readState().sessions.at(-1).mode,'sprint');assert.equal(readState().sessions.at(-1).attempted,1);click('close-modal');console.log('PASS timed sprint expiry preserves partial results and clears the timer');
assert.equal($('#modal-root').innerHTML,'');assert.equal($('#app').inert,false);globalThis.setInterval=originalInterval;
window.close();console.log('\n7 DOM integration groups passed. No real-browser layout assertions were made.');
