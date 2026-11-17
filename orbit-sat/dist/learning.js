export const STORAGE_KEY = 'orbit-learning-v1';
export const XP_PER_LEVEL = 250;
export function dateKey(date = new Date()) { return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`; }
export function dayDifference(a,b) { return Math.round((Date.parse(`${a}T12:00:00Z`)-Date.parse(`${b}T12:00:00Z`))/86400000); }
export function initialState() { return {version:1,name:'You',onboarded:false,testDate:'',planCompletions:{},annotations:{},markedForReview:[],goal:1550,xp:0,answers:{},log:[],reviews:[],bookmarks:[],days:[],frozenDays:[],freezes:2,freezeAwards:[],autoFreeze:true,skillRatings:{},itemRatings:{},schedule:{},sessions:[],xpEvents:[],dailyAwards:[]}; }
export function successProbability(studentRating,itemRating) { return 1/(1+10**((itemRating-studentRating)/400)); }
export function baseRating(question) { return {Easy:800,Medium:1100,Hard:1400}[question.difficulty]; }
export function updateElo(state,question,correct,assisted=false) {
  const student = state.skillRatings[question.skill] ?? 1000;
  const item = state.itemRatings[question.id] ?? baseRating(question);
  const expected = successProbability(student,item);
  // A correct assisted response has less influence than an independent response.
  const weight = correct && assisted ? 0.5 : 1;
  state.skillRatings[question.skill] = Math.round(Math.max(300,Math.min(2200,student+24*weight*((correct?1:0)-expected))));
  state.itemRatings[question.id] = Math.round(Math.max(300,Math.min(2200,item+12*weight*(expected-(correct?1:0)))));
  return {expected,before:student,after:state.skillRatings[question.skill]};
}
export function scheduleReview(state,id,correct,now=Date.now()) {
  const current = state.schedule[id] ?? {box:0,due:now};
  const box = correct ? Math.min(current.box+1,5) : 0;
  const days = [0,1,3,7,14,30][box];
  state.schedule[id] = {box,due:now+days*86400000};
}
export function seededRandom(value) { let seed=2166136261;for(const c of String(value)){seed=Math.imul(seed^c.charCodeAt(0),16777619);}return()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return(seed>>>0)/4294967296;}; }
export function shuffled(items,rng=Math.random) { const copy=[...items];for(let i=copy.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[copy[i],copy[j]]=[copy[j],copy[i]];}return copy; }
export function dailyQuestions(bank,date=dateKey()) {
  const rng=seededRandom(`orbit-daily-${date}`), picked=[], usedSkills=new Set();
  for(const domain of shuffled([...new Set(bank.map(q=>q.domain))],rng)) {
    const q=shuffled(bank.filter(q=>q.domain===domain&&!usedSkills.has(q.skill)),rng)[0];
    if(q){picked.push(q);usedSkills.add(q.skill);}
  }
  for(const skill of shuffled([...new Set(bank.map(q=>q.skill))].filter(s=>!usedSkills.has(s)),rng)) {
    if(picked.length===10) break;
    picked.push(shuffled(bank.filter(q=>q.skill===skill),rng)[0]);usedSkills.add(skill);
  }
  return shuffled(picked,rng);
}
export function adaptiveQuestions(bank,state,count=10,now=Date.now()) {
  const random=seededRandom(`${now}-${state.log.length}`);
  return bank.map(q=>{
    const probability=successProbability(state.skillRatings[q.skill]??1000,state.itemRatings[q.id]??baseRating(q));
    const due=state.schedule[q.id]?.due<=now;
    const unseen=!state.answers[q.id];
    const weakness=(1000-(state.skillRatings[q.skill]??1000))/2000;
    return {q,score:(due?2:0)+(unseen?0.6:0)-Math.abs(probability-0.7)+weakness+random()*0.2};
  }).sort((a,b)=>b.score-a.score).slice(0,count).map(item=>item.q);
}
export function reconcileFreezes(state,today=dateKey()) {
  const covered=[...state.days,...state.frozenDays].sort();
  const last=covered.at(-1);
  if(!last||!state.autoFreeze) return 0;
  const missed=dayDifference(today,last)-1;
  if(missed<1||missed>state.freezes) return 0;
  for(let i=1;i<=missed;i++){const d=new Date(`${last}T12:00:00`);d.setDate(d.getDate()+i);state.frozenDays.push(dateKey(d));}
  state.freezes-=missed;
  return missed;
}
export function streak(state,today=dateKey()) {
  const covered=new Set([...state.days,...state.frozenDays]);
  let d=new Date(`${today}T12:00:00`), total=0;
  if(!covered.has(dateKey(d))) d.setDate(d.getDate()-1);
  while(covered.has(dateKey(d))){total++;d.setDate(d.getDate()-1);}
  return total;
}
export function noteActivity(state,today=dateKey()) {
  reconcileFreezes(state,today);
  if(!state.days.includes(today)) state.days.push(today);
  const milestone=Math.floor(state.days.length/7);
  if(milestone>0&&!state.freezeAwards.includes(milestone)){state.freezes=Math.min(2,state.freezes+1);state.freezeAwards.push(milestone);}
}
export function awardXp(state,amount,reason,now=Date.now()) {state.xp+=amount;state.xpEvents.push({amount,reason,ts:now});}
export function tutorStem(question){return [question.passage,...(question.equations??[]),question.prompt].filter(Boolean).join('\n\n');}
export function buildTutorPayload(question,incorrectIndex,options={}) {
  if(incorrectIndex===question.answer||!question.choices[incorrectIndex]) throw Error('The tutor accepts only an incorrect response.');
  // Intentionally do not spread question. No choices, answer key, full solution, or workedSteps.
  return {question:tutorStem(question),studentIncorrectAnswer:question.choices[incorrectIndex],explanationSteps:{concept:options.simple?(question.teachConcept??question.tutorSteps.concept):question.tutorSteps.concept,check:question.tutorSteps.check,firstStep:question.tutorSteps.firstStep}};
}
export function reviewAllowed(failedAttempts) { return failedAttempts>=2; }
