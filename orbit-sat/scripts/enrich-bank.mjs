const simple={
 'Linear equations':'An equation is like a balanced seesaw. Both sides must stay equal. If you take something off one side, take the same thing off the other.',
 'Systems of equations':'Two clues can help us find two mystery numbers. Match the clues so one mystery disappears first.',
 'Linear functions':'A function is a number machine. You put one number in and follow the rule to see what comes out.',
 'Slope':'Slope tells us how steep a hill is. Count how far up it goes and compare that with how far across it goes.',
 'Linear inequalities':'This is like a seesaw where one side is bigger. Keep track of which side is bigger while you change both sides the same way.',
 'Linear word problems':'Some money is paid just once. Some money is paid again each hour. Keep those two parts separate.',
 'Quadratic equations':'Two pieces are multiplied. If the result is zero, at least one piece must be zero. Check each piece on its own.',
 'Quadratic functions':'A square is never less than zero. Think about the lowest place the curved graph can reach.',
 'Exponents':'An exponent tells us how many copies of a number are multiplied. Think about how the copies join when we multiply two groups.',
 'Polynomial expressions':'Each part in the first group needs a turn with each part in the second group. Then put matching kinds of pieces together.',
 'Percentages':'A percent means parts out of one hundred. A sale takes some parts away; the price is what stays.',
 'Statistics':'To find the mean, imagine sharing the total fairly so each number gets the same amount.',
 'Probability':'Count the things you want. Then compare that count with all the things you could pick.',
 'Ratios':'A ratio is a recipe. Each kind gets a set number of equal scoops. Find how big one scoop is first.',
 'Rates and units':'A rate tells how much happens in a certain time. Make sure the time pieces are the same size before comparing.',
 'Right triangles':'A right triangle has a square corner. Its long side and two shorter sides follow a special squares rule.',
 'Circles':'A circle is round. The radius goes from the middle to the edge. Its area is the space inside, not the path around it.',
 'Words in context':'A word can have more than one meaning. Read the words around it like clues in a little story.',
 'Transitions':'A transition is a bridge between two ideas. Ask if the next idea agrees, changes direction, gives an example, or shows what happened.',
 'Subject–verb agreement':'Find who or what is doing the action. The action word needs to match that person or thing.',
 'Sentence boundaries':'A whole sentence has a person or thing and an action. Check if you have two whole sentences that need a proper join.',
 'Agreement with each':'Each means one at a time. Think about just one member of the group when you pick the action word.',
 'Parallel structure':'Words in a list should match, like a row of toys facing the same way. Look at how the other action words end.',
 'Nonessential clauses':'Some words are an extra little note. Put a pause at the start and the end so the main sentence stays clear.',
 'Central ideas':'Ask what the whole little passage is mostly telling you. Pick an idea that fits all the important parts.',
 'Inferences':'Be a careful detective. Use clues the passage really gives you. Do not add a big guess that the clues cannot support.'
};
export function enrichBank(bank){for(const q of bank){q.revision??=1;q.skills??=[q.skill];q.equations??=[];q.teachConcept??=simple[q.skill]??q.tutorSteps.concept;q.targetSeconds=q.subject==='Math'?95:71;q.irt={a:1.15,b:{Easy:-1,Medium:0,Hard:1.2}[q.difficulty],c:.25,calibrated:false};q.desmosTip??=q.subject==='Math'?'Use Desmos to check the relationship or your setup. Read which quantity the question asks for before selecting a value.':null;q.pacingTip=q.difficulty==='Hard'?'Allow a little extra setup time, then mark for review if you are stuck. Protect time for the rest of the section.':`Use about ${q.targetSeconds} seconds as an average budget. Mark and return rather than spending the whole session on one item.`;
 if(!q.wrongChoiceFeedback)q.wrongChoiceFeedback=q.choices.map((choice,i)=>{
  if(i===q.answer)return{reason:'',type:'',source:'choice-rule'};
  let type=q.subject==='Math'?'Method or arithmetic':'Misread evidence';let reason;
  if(q.skill==='Transitions'){const relation={However:'a contrast',Therefore:'a result','For example':'an example',Moreover:'an added point'};reason=`“${choice}” signals ${relation[choice]}. Here the second sentence provides ${relation[q.choices[q.answer]]}, so that relationship does not fit.`;type='Logical relationship';}
  else if(q.skill==='Words in context'){reason=`“${choice}” does not fit this sentence’s context. The detail in “${q.passage}” supports the meaning “${q.choices[q.answer]}” instead.`;type='Context meaning';}
  else if(q.skill==='Sentence boundaries'){reason=choice.includes(', and,')?'The extra comma separates the conjunction from its clause. Join the independent clauses with a valid boundary.':choice.includes(',')?'A comma alone joins two independent clauses here, creating a comma splice.':'The two complete clauses run together without a valid boundary.';type='Sentence boundary';}
  else if(q.skill==='Nonessential clauses'){reason=choice.includes(';')?'A semicolon cannot introduce this dependent “which” clause. The inserted nonessential clause needs paired commas.':choice.includes(':')?'A colon does not mark the start of this nonessential “which” clause; it is an interruption requiring paired commas.':'The clause ends with a comma, but this option omits the opening comma before the nonessential clause.';type='Punctuation';}
  else if(q.domain==='Standard English Conventions'){reason=`“${choice}” breaks the ${q.skill.toLowerCase()} pattern. ${q.explanation}`;type=q.skill==='Parallel structure'?'Parallel structure':'Agreement';}
  else if(q.domain==='Information & Ideas'){reason=`This choice claims “${choice}” The passage instead supports: ${q.choices[q.answer]} It does not provide evidence for the alternative’s added or reversed claim.`;type=/all|every|always|never|guarantee|entire|necessarily/i.test(choice)?'Unsupported generalization':'Misread evidence';}
  else if(q.skill==='Linear equations'){const m=q.prompt.match(/If (\d+)x \+ (\d+) = (\d+)/);const lhs=Number(m[1])*Number(choice)+Number(m[2]);reason=`Substituting x = ${choice} gives a left side of ${lhs}, which differs from ${m[3]}. Undo the addition and multiplication in reverse order.`;type=Number(choice)<0?'Sign error':'Inverse operation';}
  else if(q.skill==='Slope'){reason=`The coordinate changes must be divided in the same order. The slope is ${q.choices[q.answer]}; ${choice} does not equal that rise-to-run ratio.`;type=Number(choice)<0?'Sign error':'Rate setup';}
  else if(q.skill==='Percentages'){reason=`A discount is a fraction of the original price, and the sale price is what remains. ${q.explanation} The amount ${choice} does not represent that remaining price.`;type='Percent base or remainder';}
  else if(q.skill==='Circles'){reason=`This option uses the radius incorrectly or confuses area with circumference. ${q.explanation}`;type='Area vs circumference';}
  else if(q.skill==='Probability'){reason=`The numerator must count the red counters, and the denominator must include all colors. ${choice} counts the wrong set of favorable outcomes.`;type='Wrong quantity';}
  else{reason=`Check the quantity and operation represented by ${choice}. ${q.explanation}`;type=q.subject==='Math'?'Method or arithmetic':'Misread evidence';}
  return{reason,type,source:'choice-rule'};
 });q.distractorNotes=q.wrongChoiceFeedback.filter((_,i)=>i!==q.answer).map(f=>f.reason);
}return bank;}
