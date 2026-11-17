import {allowedTutorQuestions} from './tutor-bank.js';
// This is an on-device rule-based tutor, not a connected generative AI model.
// Kept as a system prompt as well as enforced by the application and worker boundary.
export const TUTOR_SYSTEM_PROMPT = `You are Orbit's SAT-only, answer-blind tutor. Discuss only allowlisted Orbit bank stems; refuse general chat and out-of-bank questions. Your only learning inputs are the question stem, the student's incorrect answer, and answer-free explanation steps. Never request an answer key, choices, or the final worked solution. Never state, label, calculate, or guess the final answer. Level One teaches conceptual knowledge. Level Two identifies the likely mistake in the student's response without giving a replacement answer. Level Three guides the first operation without completing the problem. Adapt to the selected incorrect response and prior hint requests. Answer review is permitted only after two failed attempts; the application enforces this separately. Even after that threshold, the tutor must never receive or reveal the final answer. Ask the student to do the next piece of thinking.`;

function diagnose(question,wrong,check) {
  const equation=question.match(/If (\d+)x \+ (\d+) = (\d+)/);
  if(equation&&Number.isFinite(Number(wrong))){const [,a,b,c]=equation.map(Number);const residual=a*Number(wrong)+b-c;return `Substituting your selection makes the left side ${residual>0?'larger':'smaller'} than the right side. ${check}`;}
  if(question.includes('slope')) return `Your choice needs to represent a rate of change, rather than just a difference in coordinates. ${check}`;
  if(question.includes('discounts it')){
    const price=Number(question.match(/costs \$(\d+)/)?.[1]),percent=Number(question.match(/by (\d+)%/)?.[1]);
    if(Number(wrong)===price*percent/100)return 'Your selection is the amount removed from the price. The question asks for what remains. Set up that subtraction without calculating it yet.';
  }
  if(question.includes('transition')){
    const relationship={However:'contrast',Therefore:'a result','For example':'an illustration',Moreover:'an additional point'}[wrong];
    return `“${wrong}” signals ${relationship??'a particular relationship'}. Check whether that matches what the second sentence does. Describe the connection before selecting another word.`;
  }
  if(question.includes('most nearly means')) return `Test “${wrong}” against the specific detail in the sentence. A meaning can be valid elsewhere and still fail to fit this context. ${check}`;
  if(question.includes('conclusion')) return `Your selected conclusion needs support from the observations actually reported. ${check}`;
  return `Let’s examine your selection rather than replacing it. ${check}`;
}
export function createTutorEngine({teach=false}={}) {
  const memory=new Map();
  return function tutor(payload) {
    const keys=Object.keys(payload).sort().join(',');
    if(keys!=='explanationSteps,question,studentIncorrectAnswer') throw Error('Tutor payload must contain only the three allowed inputs.');
    const {question,studentIncorrectAnswer:wrong,explanationSteps:steps}=payload;
    if(!allowedTutorQuestions.has(question))throw Error('Orbit can only discuss its own SAT question bank. Try an Orbit practice question first.');
    if(typeof question!=='string'||typeof wrong!=='string'||Object.keys(steps).sort().join(',')!=='check,concept,firstStep') throw Error('Invalid answer-free tutor inputs.');
    if(teach)return{level:1,title:'Teach mode · simple words',message:steps.concept,followUp:'Ask your learner to say the idea in their own words, then try only the first step together.'};
    const history=memory.get(question)??{requests:0,responses:[]};
    history.requests++;history.responses.push(wrong);memory.set(question,history);
    const level=Math.min(3,history.requests);
    const changed=history.responses.length>1&&history.responses.at(-2)!==wrong;
    if(level===1)return {level,title:'Start with the idea',message:steps.concept,followUp:'How could that idea help you check your selection?'};
    if(level===2)return {level,title:'Find the sticking point',message:diagnose(question,wrong,steps.check),followUp:changed?'What did you change between your two selections?':'Which part of your method could you check first?'};
    return {level,title:'Take just the first step',message:steps.firstStep,followUp:history.requests>3?'Write your setup before you calculate. The next step is yours.':'Try that setup, then return to the question. I’ll leave the final calculation to you.'};
  };
}
