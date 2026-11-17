import {createTutorEngine} from './tutor-engine.js';
const tutor=createTutorEngine({teach:new URL(self.location.href).searchParams.get('mode')==='teach'});
// No imports of the bank, no network access, and no answer-key fields in messages.
self.onmessage=event=>{
  try {self.postMessage({ok:true,hint:tutor(event.data)});}
  catch(error){self.postMessage({ok:false,error:error.message});}
};
