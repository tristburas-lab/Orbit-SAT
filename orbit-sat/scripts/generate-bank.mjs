import { writeFileSync } from 'node:fs';
import { validateBank } from './bank-quality.mjs';
import {rewriteHardMath} from './hard-math.mjs';
import {enrichBank} from './enrich-bank.mjs';
import {IRT_MODEL} from '../dist/irt.js';

const bank = [];
let seed = 8160;
function random() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }
const fmt = n => Number(n.toFixed(4)).toString();
function numberChoices(n, candidates = []) {
  const all = [n, ...candidates, n + 1, n - 1, n + 2, n * 2, n + 3];
  return [...new Set(all.map(fmt))].slice(0, 4);
}
function add(subject, domain, skill, difficulty, prompt, choices, correct, explanation, hint, passage = '') {
  const answerText = String(correct);
  const unique = [...new Set(choices.map(String))];
  if (unique.length !== 4 || !unique.includes(answerText)) throw Error('Invalid choices: ' + prompt);
  for (let i = unique.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [unique[i], unique[j]] = [unique[j], unique[i]]; }
  bank.push({ id: `${subject === 'Math' ? 'M' : 'R'}${String(bank.filter(q => q.subject === subject).length + 1).padStart(3, '0')}`, subject, domain, skill, difficulty, prompt, passage, choices: unique, answer: unique.indexOf(answerText), explanation, hint });
}
function math(domain, skill, level, prompt, answer, candidates, explanation, hint) {
  add('Math', domain, skill, level, prompt, numberChoices(answer, candidates), fmt(answer), explanation, hint);
}

for (let i = 0; i < 15; i++) {
  const a = i % 6 + 2, n = i + 3, b = i * 2 + 5, k = i + 2;
  math('Algebra', 'Linear equations', 'Easy', `If ${a}x + ${b} = ${a*n+b}, what is the value of x?`, n, [n+a, n-a, a*n], `Subtract ${b} from both sides to get ${a}x = ${a*n}. Divide both sides by ${a}: x = ${n}.`, 'Undo addition first, then divide by the coefficient of x.');
  const y = i + 1, x = i * 2 + 7;
  math('Algebra', 'Systems of equations', 'Medium', `The equations x + y = ${x+y} and x − y = ${x-y} form a system. What is x?`, x, [y, x+y, x-y], `Add the equations. The y terms cancel, leaving 2x = ${2*x}. Therefore x = ${x}.`, 'Add the two equations to eliminate y.');
  math('Algebra', 'Linear functions', 'Easy', `The function f is defined by f(x) = ${a}x − ${b}. What is f(${k})?`, a*k-b, [a*k+b, a+k-b, a*(k-b)], `Substitute ${k} for x: f(${k}) = ${a}(${k}) − ${b} = ${a*k-b}.`, 'Replace every x in the rule with the input value.');
  const slope = i % 5 + 2;
  math('Algebra', 'Slope', 'Medium', `A line passes through (${n}, ${n+a}) and (${n+3}, ${n+a+3*slope}). What is the slope of the line?`, slope, [-slope, slope+1, slope*3], `Slope is change in y divided by change in x: (${n+a+3*slope} − ${n+a}) / (${n+3} − ${n}) = ${3*slope}/3 = ${slope}.`, 'Calculate rise over run, keeping the order of the two points consistent.');
  const c = a*n-b;
  add('Math', 'Algebra', 'Linear inequalities', 'Medium', `Which inequality is equivalent to ${a}x − ${b} > ${c}?`, [`x > ${n}`, `x < ${n}`, `x > ${n+a}`, `x < ${n+a}`], `x > ${n}`, `Add ${b}: ${a}x > ${a*n}. Divide by the positive number ${a}, so the inequality sign stays the same: x > ${n}.`, 'Adding a value preserves the inequality. Dividing by a positive value also preserves its direction.');
  const fee = 10+i, rate = 4+i%5, hours = i%6+2;
  math('Algebra', 'Linear word problems', 'Easy', `A bike rental costs a $${fee} starting fee plus $${rate} per hour. The total bill is $${fee+rate*hours}. For how many hours was the bike rented?`, hours, [hours+1, hours+fee, rate*hours], `Model the cost as ${fee} + ${rate}h = ${fee+rate*hours}. Subtract ${fee}, then divide by ${rate}, giving h = ${hours}.`, 'Separate the one-time fee from the amount that depends on time.');

  const r = i+1, s = i+5;
  math('Advanced Math', 'Quadratic equations', 'Medium', `What is the smaller solution of (x − ${r})(x − ${s}) = 0?`, r, [-r, s, r+s], `A product equals zero when at least one factor is zero. The solutions are x = ${r} and x = ${s}; the smaller is ${r}.`, 'Set each factor equal to zero.');
  math('Advanced Math', 'Quadratic functions', 'Medium', `The function g is defined by g(x) = (x − ${n})² + ${k}. What is the minimum value of g(x)?`, k, [-k, n, n*n+k], `A square is never negative. It is zero at x = ${n}, so the smallest output is 0 + ${k} = ${k}.`, 'In vertex form, the constant outside the squared term tells you the lowest output when the coefficient is positive.');
  const exp = i%4+2, exp2 = i%5+3;
  math('Advanced Math', 'Exponents', 'Easy', `If 2^${exp} × 2^${exp2} = 2^k, what is k?`, exp+exp2, [exp*exp2, exp2-exp, exp+exp2+1], `When multiplying powers with the same base, add their exponents: k = ${exp} + ${exp2} = ${exp+exp2}.`, 'Multiplying like bases means adding exponents.');
  add('Math', 'Advanced Math', 'Equivalent expressions', 'Hard', `For x ≠ ${r}, which expression is equivalent to (x² − ${r*r}) / (x − ${r})?`, [`x + ${r}`, `x − ${r}`, `x² + ${r}`, `${r}x`], `x + ${r}`, `Factor the numerator as a difference of squares: (x − ${r})(x + ${r}). Cancel the common factor x − ${r}, which is nonzero by the restriction. The result is x + ${r}.`, 'Recognize a difference of squares before canceling.');
  math('Advanced Math', 'Polynomial expressions', 'Medium', `When (x + ${a})(x + ${b}) is written as x² + cx + d, what is c?`, a+b, [a*b, b-a, a+b+1], `Distribute: x² + ${b}x + ${a}x + ${a*b}. Combine the x terms, so c = ${a} + ${b} = ${a+b}.`, 'The coefficient of x comes from the two cross-products.');
  const d = i%6+3;
  math('Advanced Math', 'Absolute value', 'Hard', `What is the sum of the two solutions to |x − ${n}| = ${d}?`, 2*n, [n, d, 2*n+2*d], `The solutions are ${n} + ${d} = ${n+d} and ${n} − ${d} = ${n-d}. Their sum is ${2*n}.`, 'An absolute value equation measures distance in two directions.');

  const price = (10+i)*20, discount = (i%8+1)*5, sale = price*(1-discount/100);
  math('Problem-Solving & Data', 'Percentages', 'Medium', `A jacket originally costs $${price}. A store discounts it by ${discount}%. What is the sale price, in dollars?`, sale, [price*discount/100, price+price*discount/100, price-discount], `The discount is ${discount}/100 × ${price} = $${fmt(price*discount/100)}. Subtract it from $${price}: $${fmt(sale)}.`, 'Find the fraction of the original price that remains after the discount.');
  math('Problem-Solving & Data', 'Statistics', 'Easy', `A data set contains ${n}, ${n+2}, ${n+4}, and ${n+6}. What is the mean of the data set?`, n+3, [n+2, n+4, 4*n+12], `Add all four values: ${4*n+12}. Divide by 4 to get a mean of ${n+3}.`, 'The mean is the sum divided by the number of values.');
  const red = i+2, blue = i+3, green = i+4, total = red+blue+green;
  add('Math', 'Problem-Solving & Data', 'Probability', 'Medium', `A bag contains ${red} red, ${blue} blue, and ${green} green counters. One counter is selected at random. What is the probability it is red?`, [`${red}/${total}`, `${blue}/${total}`, `${green}/${total}`, `${red+blue}/${total}`], `${red}/${total}`, `There are ${red} favorable outcomes and ${total} equally likely outcomes in total. The probability is ${red}/${total}.`, 'Count the desired outcomes, then divide by all possible outcomes.');
  math('Problem-Solving & Data', 'Ratios', 'Easy', `In a greenhouse, the ratio of tomato plants to pepper plants is 2:3. If there are ${5*n} plants in total, how many are pepper plants?`, 3*n, [2*n, n, 5*n], `There are 2 + 3 = 5 ratio parts. Each part represents ${5*n}/5 = ${n} plants. Pepper plants occupy 3 parts, so there are ${3*n}.`, 'Find the value of one ratio part before multiplying.');
  const speed = 32+i*4, dist = speed*.75;
  math('Problem-Solving & Data', 'Rates and units', 'Medium', `A train travels ${fmt(dist)} kilometers in 45 minutes at a constant speed. What is its speed in kilometers per hour?`, speed, [dist, speed/2, speed*2], `45 minutes is 45/60 = 0.75 hours. Speed = distance/time = ${fmt(dist)}/0.75 = ${speed} kilometers per hour.`, 'Convert minutes to hours before dividing distance by time.');

  math('Geometry & Trigonometry', 'Right triangles', 'Medium', `A right triangle has legs of length ${3*k} and ${4*k}. What is the length of its hypotenuse?`, 5*k, [7*k, k, 25*k*k], `Use the Pythagorean theorem: c² = ${3*k}² + ${4*k}² = ${25*k*k}. Taking the positive square root gives c = ${5*k}.`, 'For a right triangle, a² + b² = c².');
  const rad = i+3;
  add('Math', 'Geometry & Trigonometry', 'Circles', 'Easy', `A circle has a radius of ${rad} units. What is its area, in square units?`, [`${rad*rad}π`, `${2*rad}π`, `${rad}π`, `${4*rad*rad}π`], `${rad*rad}π`, `Area = πr² = π(${rad})² = ${rad*rad}π square units.`, 'Use the area formula, π times the radius squared.');
  const factor = i%4+2;
  math('Geometry & Trigonometry', 'Similar triangles', 'Hard', `Two triangles are similar. Sides of length ${3*k} and ${5*k} in the smaller triangle correspond to sides of length ${3*k*factor} and x in the larger triangle. What is x?`, 5*k*factor, [5*k+factor, 3*k*factor, 5*k/factor], `The scale factor is ${3*k*factor}/${3*k} = ${factor}. Multiply the corresponding smaller side by that factor: x = ${5*k} × ${factor} = ${5*k*factor}.`, 'All corresponding side lengths share one scale factor.');
}

const vocab = [
['meticulous','Before publishing the measurements, Lena made a meticulous review, checking every decimal and unit.','careful and precise','quick and casual','unusually public','strongly emotional'],
['transient','The puddles were transient; by midday the sun had dried them completely.','short-lived','deep','predictable','dangerous'],
['corroborate','The second sensor produced the same result, helping to corroborate the first measurement.','confirm','replace','complicate','conceal'],
['novel','Instead of repeating familiar methods, the engineer proposed a novel design.','new and original','expensive','unfinished','easily understood'],
['ambiguous','Because the directions could be interpreted in two different ways, they were ambiguous.','unclear','detailed','irrelevant','incorrect'],
['mitigate','Planting trees along the road can mitigate the heat by providing shade.','reduce','measure','predict','ignore'],
['robust','The bridge remained stable in every load test, evidence of its robust construction.','strong','ornate','temporary','inexpensive'],
['diverge','At the fork, the two trails diverge, one turning east and the other west.','separate','end','overlap','rise'],
['elusive','Although the researchers searched for years, a complete explanation remained elusive.','difficult to find','widely accepted','easy to test','plainly false'],
['pragmatic','Rather than wait for an ideal tool, Inez took a pragmatic approach and repaired the one she had.','practical','theoretical','careless','mysterious'],
['sparse','Vegetation was sparse on the rocky slope, with only a few plants growing far apart.','scattered and limited','rapidly changing','brightly colored','dense and varied'],
['catalyst','The new rail line was a catalyst for growth, encouraging businesses to open nearby.','cause of change','record of events','obstacle to action','sign of decline'],
['conventional','While most builders used conventional materials, this team experimented with recycled glass.','customary','fragile','costly','local'],
['scrutinize','Before accepting the claim, reviewers scrutinize the evidence for errors and omissions.','examine closely','summarize briefly','accept readily','keep private'],
['resilient','The resilient plants recovered quickly after the drought ended.','able to recover','slow to grow','difficult to locate','highly unusual'],
['implicit','The rule was never stated directly, but it was implicit in the coach’s examples.','suggested without being stated','unfairly applied','recently changed','clearly written'],
['inadvertent','A typing error caused an inadvertent change to the date; no one had meant to alter it.','unintentional','beneficial','permanent','obvious'],
['substantiate','The historian used original letters to substantiate her account of the meeting.','support with evidence','shorten','question','publicize'],
['diminish','As the storm moved away, the sound of thunder began to diminish.','decrease','return','spread','change direction'],
['comprehensive','The comprehensive survey included every neighborhood rather than a small sample.','thorough and inclusive','brief','outdated','costly'],
['salient','Of all the features on the map, the bright red river was the most salient.','noticeable','accurate','distant','recent'],
['concede','After seeing the new data, Ravi had to concede that his estimate was too high.','acknowledge','suspect','insist','remember'],
['tentative','With more experiments still planned, the team described its conclusion as tentative.','provisional','mistaken','unimportant','unexpected'],
['ubiquitous','Bicycles are ubiquitous in the town; they can be seen on nearly every street.','present everywhere','difficult to use','highly prized','recently introduced'],
['discrete','The report divides the project into three discrete phases, each with its own deadline.','separate','secret','flexible','lengthy'],
['facilitate','The new translation system will facilitate conversations between visitors who speak different languages.','make easier','monitor','replace','lengthen'],
['skeptical','Without reliable evidence, the scientist remained skeptical of the extraordinary claim.','doubtful','enthusiastic','unaware','fearful'],
['abundant','After a rainy spring, water was abundant, filling every pond in the reserve.','plentiful','clean','valuable','still'],
['rectify','The editor worked to rectify the error by publishing the correct figure.','correct','explain','repeat','hide'],
['bolster','Additional observations helped bolster the researchers’ confidence in their explanation.','strengthen','reveal','reduce','replace'],
['impartial','The judge was impartial, evaluating each entry by the same criteria regardless of its author.','unbiased','inexperienced','strict','generous'],
['feasible','Given the available time and budget, the smaller design was the only feasible option.','practical to carry out','visually appealing','scientifically original','universally popular'],
['negligible','The new casing added only a negligible amount of weight, less than a gram.','insignificant','uncertain','variable','unwanted'],
['articulate','The designer could articulate her reasoning clearly, making every choice easy to understand.','express','revise','defend angrily','simplify'],
['precede','In the schedule, safety training will precede laboratory work, so students learn the rules first.','come before','take the place of','continue after','occur during'],
['exemplify','The carefully organized community garden serves to exemplify effective cooperation.','illustrate','encourage','require','challenge'],
['conspicuous','Against the dark sand, the white shell was conspicuous and easy to spot.','noticeable','fragile','rare','misplaced'],
['deliberate','The team’s choice was deliberate; members spent weeks comparing the alternatives.','carefully considered','quickly reversed','widely criticized','unexpectedly helpful'],
['coherent','Each paragraph connected logically to the next, producing a coherent argument.','logically organized','unusually brief','strongly worded','widely known'],
['reconcile','The researchers tried to reconcile the two measurements by accounting for differences in their instruments.','bring into agreement','repeat independently','reject entirely','record precisely'],
['sustain','A steady supply of nutrients helped sustain the culture throughout the experiment.','maintain','enlarge','examine','introduce'],
['inhibit','Low temperatures can inhibit the chemical reaction, causing it to proceed more slowly.','restrain','initiate','reverse','observe'],
['versatile','The versatile tool can cut, sand, and polish several different materials.','adaptable to many uses','easy to transport','difficult to repair','precisely calibrated'],
['profound','The discovery had a profound effect, changing the field’s most basic assumptions.','deep and significant','brief and unexpected','easy to measure','difficult to explain'],
['empirical','The claim was based on empirical evidence collected through observation and experiment.','derived from experience and testing','accepted by tradition','based on abstract logic alone','expressed in numbers only'],
['anomalous','All the readings clustered near 20 except one anomalous reading of 85.','unusual','incorrect','imprecise','expected'],
['lucrative','The shop became lucrative when its income grew far beyond its operating costs.','profitable','popular','innovative','efficient'],
['equitable','The committee sought an equitable distribution, giving each school resources according to its needs.','fair','identical','rapid','permanent'],
['pervasive','The scent of pine was pervasive, noticeable throughout the entire forest.','widespread','pleasant','faint','unfamiliar'],
['refine','After testing the prototype, the team worked to refine the design by making several small improvements.','improve','replace','describe','copy']
];
for (let i=0;i<vocab.length;i++) {
  const [word, passage, meaning, ...wrong] = vocab[i];
  add('Reading & Writing','Craft & Structure','Words in context',i<16?'Easy':i<35?'Medium':'Hard',`As used in the text, “${word}” most nearly means`,[meaning,...wrong],meaning,`“${word}” means “${meaning}” here. The details in the sentence supply the context needed to choose this meaning.`, 'Use the clues around the word. Try substituting each choice into the sentence.',passage);
}

const transitions = [
['The first prototype performed well in calm water.','it became unstable when the water was rough.','However'],
['The museum received a large donation for repairs.','it was able to restore the damaged roof.','Therefore'],
['Some animals use tools to obtain food.','sea otters can use stones to open hard shells.','For example'],
['The new route is shorter than the old one.','it has fewer steep hills.','Moreover'],
['The soil in the shaded plot retained more water.','the plants there needed less frequent watering.','Therefore'],
['The two novels were written in the same year.','they present very different views of city life.','However'],
['Some materials expand as they warm.','a metal rail typically becomes slightly longer as its temperature rises.','For example'],
['The camera captures images at a higher resolution.','it uses less battery power than the earlier model.','Moreover'],
['The team expected the thicker insulation to reduce heat loss.','both samples lost heat at nearly the same rate.','However'],
['Heavy rain washed away the temporary footbridge.','walkers had to use a longer route.','Therefore'],
['Readers can infer a character’s feelings from physical actions.','a character who repeatedly checks the door may be anxious.','For example'],
['The archive contains letters from local residents.','it holds maps and photographs from the same period.','Moreover'],
['The train left exactly on time.','a signal problem caused it to arrive late.','However'],
['The seedlings received no water for two weeks.','many began to wilt.','Therefore'],
['Small design changes can make products easier to use.','a larger handle can help someone grip a cup.','For example'],
['The park offers walking trails through the woodland.','visitors can explore a garden of native plants.','Moreover'],
['The researcher’s initial estimate was remarkably close.','she still repeated the experiment to verify it.','However'],
['The club sold all available tickets.','no additional guests could enter the event.','Therefore'],
['Several languages borrow words from other languages.','English borrowed the word “ballet” from French.','For example'],
['The building’s windows admit natural light.','their placement allows air to circulate.','Moreover'],
['The artist usually worked on large canvases.','her final exhibition featured miniature paintings.','However'],
['The laboratory’s freezer stopped working overnight.','the team had to move the samples to another freezer.','Therefore'],
['Living things respond to changes in their surroundings.','a sunflower seedling can bend toward a source of light.','For example'],
['The revised guide includes clearer maps.','it provides details about wheelchair access.','Moreover'],
['The trail appears smooth on the map.','it crosses several areas of loose rock.','However'],
['The community added a protected bicycle lane.','cyclists no longer had to share that stretch with cars.','Therefore'],
['Writers can create rhythm through repetition.','a poet might begin several lines with the same phrase.','For example'],
['The library lends musical instruments.','it offers free lessons on how to play them.','Moreover'],
['The northern site received more sunlight.','the southern site produced the larger crop.','However'],
['Demand for the workshop exceeded the room’s capacity.','the organizers scheduled a second session.','Therefore'],
['A structure’s shape can help it bear weight.','an arch can redirect forces toward its supports.','For example'],
['The new filter removes sediment from water.','it is easier to clean than the previous filter.','Moreover'],
['The journey covered a relatively short distance.','strong winds made it take several hours.','However'],
['The grant covered the cost of new equipment.','the team could purchase the sensors it needed.','Therefore'],
['Researchers use several methods to estimate an animal’s age.','growth rings in some fish ear bones can provide age clues.','For example'],
['The exhibition features handmade ceramics.','it includes interviews explaining the makers’ techniques.','Moreover'],
['The recipe calls for only a few ingredients.','preparing them requires considerable care.','However'],
['A fallen branch blocked the path.','the runners turned back before reaching the lake.','Therefore'],
['Historical records can reveal details about everyday life.','a grocery receipt can show what a household purchased.','For example'],
['The transit app displays current arrival times.','it lets riders save their most frequent journeys.','Moreover'],
['The earlier survey found strong support for the proposal.','the later survey found that most residents opposed it.','However'],
['The artist mixed equal amounts of blue and yellow paint.','the resulting mixture appeared green.','Therefore'],
['Some species rely on camouflage.','a leaf insect resembles the leaves on which it rests.','For example'],
['The report explains how the data were collected.','it makes the full data set available to readers.','Moreover'],
['The initial design required expensive parts.','the final version used affordable materials.','However'],
['The password was entered incorrectly too many times.','the account was temporarily locked.','Therefore'],
['Many cities reuse buildings for new purposes.','a former factory might become a public library.','For example'],
['The course introduces basic programming concepts.','it gives students opportunities to create their own projects.','Moreover'],
['The old clock no longer keeps accurate time.','its carefully carved case remains in excellent condition.','However'],
['The sensor detected a sudden rise in temperature.','the cooling system switched on automatically.','Therefore']
];
const relationships={However:'contrast',Therefore:'a result','For example':'a specific example',Moreover:'an additional supporting point'};
for(const [first, second, answer] of transitions) add('Reading & Writing','Expression of Ideas','Transitions','Medium','Which choice completes the text with the most logical transition?',['However','Therefore','For example','Moreover'],answer,`The second sentence introduces ${relationships[answer]}. “${answer}” expresses that relationship. Read both sentences together to check the connection.`,`Decide whether the second sentence adds, contrasts, illustrates, or gives a result.`,`${first} _____, ${second}`);

const objects=[['new microscope','microscopes','biology team','cells'],['digital catalog','catalogs','archive staff','manuscripts'],['weather station','stations','research group','rainfall patterns'],['revised map','maps','survey team','trails'],['water sensor','sensors','ecology team','streams'],['computer model','models','engineering team','bridge designs'],['field notebook','notebooks','botany group','seedlings'],['audio recorder','recorders','history team','interviews'],['improved camera','cameras','astronomy club','stars'],['electronic scale','scales','chemistry class','samples']];
for(const [singular,plural,team,thing] of objects) {
  add('Reading & Writing','Standard English Conventions','Subject–verb agreement','Easy','Which choice completes the text so that it conforms to the conventions of Standard English?',['allows','allow','have allowed','are allowing'],'allows',`The subject is the singular noun “${singular}.” It takes the singular verb “allows.” The phrase describing what the team does does not change the subject.`, 'Identify the subject and decide whether it is singular or plural.',`The ${singular} _____ the ${team} to examine ${thing} more closely.`);
  add('Reading & Writing','Standard English Conventions','Sentence boundaries','Medium','Which choice completes the text so that it conforms to the conventions of Standard English?',['ready; the','ready, the','ready the','ready, and, the'],'ready; the','Both parts are independent clauses: each has a subject and a verb and can stand alone. A semicolon can join them. A comma by itself creates a comma splice.', 'Check whether the words on each side could form a complete sentence.',`The ${singular} was _____ ${team} began collecting data.`);
  add('Reading & Writing','Standard English Conventions','Agreement with each','Medium','Which choice completes the text so that it conforms to the conventions of Standard English?',['is','are','have','be'],'is','The subject “Each” is singular even though the phrase after it contains a plural noun. It therefore takes “is.”', 'The subject is “Each,” not the noun inside the “of” phrase.',`Each of the ${plural} _____ labeled with a unique identification number.`);
  add('Reading & Writing','Standard English Conventions','Parallel structure','Medium','Which choice completes the text so that it conforms to the conventions of Standard English?',['recording','to record','records','recorded'],'recording','The series uses three parallel -ing forms: collecting, recording, and comparing. “Recording” preserves that pattern.', 'Look for the grammatical form used by the other items in the list.',`The ${team} spent the morning collecting data, _____ observations, and comparing results.`);
  add('Reading & Writing','Standard English Conventions','Nonessential clauses','Hard','Which choice completes the text so that it conforms to the conventions of Standard English?',[`${singular}, which`,`${singular} which`,`${singular}; which`,`${singular}: which`],`${singular}, which`,'The “which” clause adds nonessential information. A comma marks each end of that clause; the comma after “week” is already present, so a comma before “which” is also required.', 'An interrupting nonessential clause needs punctuation at both ends.',`The _____ was installed last week, has already improved the team’s work with ${thing}.`);
}

const readings = [
['A school garden grew two groups of radishes from the same seed packet. Both groups received equal water, but one was shaded for half the day. After four weeks, the unshaded plants were taller on average.','Light exposure may have affected radish growth.','The experiment changed light exposure while keeping water amounts equal.','The passage compares two growing conditions.'],
['A city library began lending portable Wi-Fi devices. Most borrowers reported using them for schoolwork or job applications. The library then added more devices to reduce its waiting list.','The library expanded a service that helped people access online resources.','Demand for the devices was greater than the initial supply.','Look at why the library added devices.'],
['An artist makes large sculptures from discarded bicycle parts. She leaves their original shapes visible, encouraging viewers to recognize the objects’ former uses. Her work connects everyday transportation with artistic expression.','The sculptures give familiar discarded objects a new artistic role.','Recognizing the bicycle parts is part of the intended viewing experience.','Consider how the materials relate to the artistic purpose.'],
['Researchers placed microphones in a forest and recorded sounds for several weeks. They identified bird calls in the recordings, including calls from species rarely seen during daytime surveys.','Sound recordings can reveal birds that visual surveys may miss.','Using more than one survey method could provide a fuller picture of the forest’s birds.','Compare what the recordings and visual surveys revealed.'],
['A historian studying a port town consulted shipping logs and household diaries. The logs showed changes in trade, while the diaries revealed how those changes affected family routines.','Different kinds of records can reveal complementary aspects of history.','Shipping logs alone would not provide the same detail about household routines.','Each source contributes a different kind of information.'],
['A team designed a solar oven using cardboard and reflective foil. On clear days it warmed water effectively. Under heavy cloud cover, the water temperature rose much less.','The solar oven’s performance depended on weather conditions.','The oven would be less dependable during consistently cloudy weather.','Notice the contrast between clear and cloudy conditions.'],
['For years a community group removed litter from a riverbank each month. After volunteers installed clearly marked waste bins nearby, the amount of litter collected at each cleanup decreased.','Providing waste bins was associated with less litter on the riverbank.','The passage does not establish that litter disappeared entirely.','Pay attention to the difference between a decrease and complete elimination.'],
['A poet often places long, flowing lines beside very short ones. In readings, she pauses after the short lines, giving listeners time to consider a key image before the poem continues.','The poet uses variation in line length to shape attention and pacing.','The short lines are intended to slow the audience’s attention at certain moments.','Link the pauses to the effect on listeners.'],
['Students tested two packages designed to protect fragile objects. The heavier package survived more drops, but it cost twice as much to make. The students discussed which design better suited a low-cost delivery service.','Design choices can involve a tradeoff between protection and cost.','The most protective package might not be the best choice for every use.','The design discussion considers more than one criterion.'],
['A botanist photographed the same patch of wildflowers every week for a spring season. The sequence showed that different species reached peak bloom at different times, even though they shared the same small area.','Repeated observations showed differences in flowering schedules.','A single photograph would not reveal the full season’s sequence of blooms.','Think about the advantage of observations over time.'],
['A museum replaced several long wall labels with short summaries and optional detailed guides. Visitors could read the summaries quickly and choose to explore individual works in more depth.','The museum offered different levels of detail to suit visitors’ interests.','The detailed information remained available after the labels changed.','Notice that the new guides supplement the shorter labels.'],
['An engineer modeled a bridge with removable supports. When she shifted one support, the model bent under the same load. Restoring the original support position reduced the bending.','Support placement affected the bridge model’s response to a load.','The load alone did not explain the difference in bending.','Track which condition changed between tests.'],
['A language club pairs beginners with experienced speakers for informal conversations. Participants still attend grammar lessons, but many say the conversations make them more comfortable speaking.','Informal conversations can complement formal language instruction.','Feeling more comfortable speaking does not require replacing grammar lessons.','Both kinds of practice continue in the program.'],
['A researcher found that a dark stone surface warmed faster in sunlight than a pale stone surface. Both samples had the same size and material composition; their surface colors differed.','Surface color may influence how quickly a material warms in sunlight.','Matching the samples’ sizes helped limit another possible explanation.','Identify the variable that differed and the conditions that matched.'],
['A composer adapted a traditional melody for a small electronic ensemble. She preserved its recognizable rhythm but changed the instruments and harmonies. Listeners described the piece as familiar yet surprising.','An adaptation can preserve recognizable features while changing others.','The melody’s rhythm helped listeners recognize the source.','Distinguish what was preserved from what was changed.'],
['A neighborhood planted trees along a street. Several years later, measurements on sunny afternoons showed lower pavement temperatures beneath the trees than in nearby unshaded areas.','Tree shade was associated with cooler pavement on sunny afternoons.','The measurements do not show how temperatures compared at every time of day.','Keep the conclusion within the conditions actually measured.'],
['A science class repeated a measurement ten times rather than relying on one reading. Most values were close together, but one was far higher. The students checked the equipment before deciding how to interpret the outlier.','Repeated measurements helped students notice an unusual result.','One reading alone would not reveal whether it differed from the typical results.','Consider why a set of measurements is useful.'],
['A local bakery tracks unsold loaves at closing time. After changing its daily production to match recent demand, it reduced waste while keeping most popular varieties available.','Using demand records helped the bakery reduce excess production.','The bakery considered both reducing waste and meeting customer demand.','Look at both outcomes mentioned in the passage.'],
['A translator compared two versions of an old poem. One followed the original sentence structure closely; the other changed that structure to preserve the poem’s rhythm in a new language.','Translators may prioritize different features of a source text.','Preserving sentence structure and preserving rhythm can require different choices.','Compare the goal of each version.'],
['An ecologist surveyed insects in a meadow before and after mowing. Fewer insects were counted immediately after mowing. She planned additional surveys to learn whether the numbers would recover.','The ecologist distinguished a short-term observation from a longer-term question.','The first post-mowing survey was not enough to establish a lasting decline.','Notice why the ecologist planned further observations.'],
['A robotics team first built a machine with many moving parts. Frequent jams led the team to simplify the mechanism. The revised machine completed fewer types of tasks but performed its main task more reliably.','Simplifying a design improved reliability while reducing its range of functions.','The team accepted a limitation in order to improve its main performance goal.','Compare both the benefit and the cost of the revision.'],
['A historian noticed that two newspapers described the same event differently. She compared the accounts with meeting minutes and private letters rather than assuming either newspaper was fully accurate.','Comparing multiple sources can help evaluate differing historical accounts.','The historian treated the newspaper accounts as evidence to examine rather than unquestioned fact.','Focus on how the historian responded to the disagreement.'],
['A teacher asked students to explain how they solved a math problem. Two students reached the same correct answer using different methods. Their explanations helped classmates see connections between the methods.','Discussing different solution methods can deepen understanding of a problem.','A correct answer alone would not show how the students’ methods were related.','Think about what the explanations added beyond the answer.'],
['A conservation group planted several native flower species in a vacant lot. The species bloomed at different points in the growing season, providing flowers over a longer period than a single species would.','Planting multiple species extended the period when flowers were available.','The timing of blooms mattered to the group’s planting design.','Connect the variety of species with the sequence of blooms.'],
['A product designer observed people opening a package. Several struggled to find its pull tab. Enlarging the tab and adding a contrasting color made the opening point easier to identify in a second trial.','Observing users helped the designer identify and address a usability problem.','The revision targeted how easily users could locate the opening point.','Match the observed difficulty with the changes made.']
];
const readingDistractors=[
 ['The radishes grew differently because one group received more water.','Shade made the radishes grow taller on average.','The experiment compared seeds from different packets.','The results show that every plant species grows best without shade.','The two groups had identical average heights after four weeks.','The experiment established that water never influences radish growth.'],
 ['The library discontinued online resources in favor of print books.','The devices were used mainly for activities unrelated to work or study.','The library reduced device lending to eliminate a waiting list.','Every person in the city borrowed a device.','The initial number of devices was sufficient to meet all demand.','The devices replaced all other library services.'],
 ['The artist disguises recycled parts to erase their original identities.','The artist’s main goal is to manufacture working bicycles.','The sculptures use only new materials shaped to look old.','Viewers are not supposed to notice the source of the materials.','The sculptures can function as usable bicycles.','The artist avoids connections between ordinary life and art.'],
 ['Visual surveys detected every bird recorded in the forest.','The recordings revealed fewer kinds of birds than were known to exist.','The study focused on improving the appearance of the forest.','Every recorded species was entirely absent from daytime surveys.','Recordings alone establish the exact number of individual birds.','Bird species can always be identified by sight more easily than by sound.'],
 ['The diaries made all shipping records unnecessary.','Trade changes affected shipping but had no effect on family life.','The historian found the two kinds of records equally useful for the same details.','The diaries provide complete trade totals for every ship.','The shipping logs alone describe every family routine in detail.','Differences between records prove that one source must be false.'],
 ['The oven heated water equally well in all weather conditions.','Cardboard prevented the solar oven from warming water.','Cloud cover increased the oven’s heating performance.','The oven can never warm water on a cloudy day.','Clear weather guarantees a particular final water temperature.','The results establish that all cardboard ovens have identical performance.'],
 ['Monthly cleanups increased the amount of litter left on the bank.','Installing bins made future cleanups unnecessary.','The group stopped collecting litter before installing bins.','The installation proves that no other factor affected litter amounts.','The number of volunteers necessarily decreased after the bins appeared.','Litter increased at every location near the new bins.'],
 ['The poet uses uniform line lengths to keep the pace constant.','The short lines remove the need for listeners to think about images.','The poet’s reading style is unrelated to her written line lengths.','Every short line has the same meaning as the line before it.','The longer lines are always more important than the shorter lines.','The pauses prevent listeners from recalling any earlier image.'],
 ['The students found that the cheapest package offered the most protection.','The heavier package was better on every criterion the students considered.','The cost of a package had no relevance to the delivery service.','The delivery service must choose the heavier package regardless of cost.','The lighter package failed every drop test.','Doubling a package’s cost always doubles its protective ability.'],
 ['All the wildflower species bloomed most strongly at the same time.','The photographs showed that only one species could grow in the area.','The study compared flowers from widely separated locations.','The sequence established that weather did not influence any species.','Every species bloomed for the entire spring season.','Weekly photographs revealed the exact time each individual flower opened.'],
 ['The museum removed every source of detailed information.','The new labels required all visitors to spend longer reading.','The guides replaced the works of art as the exhibition’s focus.','Every visitor preferred the short summaries to detailed guides.','Detailed study of individual works was no longer possible.','The change established that long labels can never be useful.'],
 ['Moving the support reduced the load placed on the model.','The model bent equally in every support arrangement.','The experiment tested only the color of the bridge model.','The bridge model would never bend under a larger load.','Support placement is the only factor that can affect any bridge.','The shifted support position improved the model’s stability.'],
 ['Informal conversation made grammar lessons unnecessary.','Beginners reported less confidence after talking with experienced speakers.','The club focused entirely on written language exercises.','Every participant became fluent after a single conversation.','The club stopped offering grammar lessons when conversations began.','Experienced speakers cannot benefit from any language practice.'],
 ['The dark stone warmed faster because it was larger.','Surface color made no observable difference in the test.','The pale stone warmed faster under the same sunlight.','The result proves that dark objects always reach a higher temperature in every setting.','The test compared samples made from different materials.','Equal size guarantees identical warming rates regardless of color.'],
 ['The composer removed every recognizable feature of the melody.','The adaptation used the traditional instruments without changing the harmony.','Listeners found the piece entirely unfamiliar.','The adaptation preserved every note and every harmony of the original.','Changing instruments necessarily destroys a melody’s identity.','The listeners’ descriptions show that they disliked the adaptation.'],
 ['The trees were associated with warmer pavement in the measured areas.','The measurements compared sunny afternoons with winter nights.','Pavement temperatures were identical under trees and in the sun.','The trees lower pavement temperature by the same amount at every hour.','Planting trees is the only way to change pavement temperature.','The measurements establish that all streets in the city became cooler.'],
 ['Repeating a measurement prevented all unusual readings.','The students accepted the highest reading without checking it.','The repeated measurements showed that every reading was equally high.','The high reading must be a meaningful discovery rather than an equipment issue.','All close readings are necessarily accurate.','One outlier proves that the entire experiment is unusable.'],
 ['Producing the same number of loaves every day reduced waste.','The bakery eliminated popular varieties to avoid tracking demand.','Demand records caused the bakery to discard more unsold bread.','The bakery sold every loaf after adjusting its production.','Past demand guarantees the exact number of tomorrow’s customers.','The bakery stopped considering customer preferences entirely.'],
 ['Both translators made exactly the same stylistic choices.','The translator who preserved rhythm also preserved every original sentence structure.','The two versions prove that poetry cannot be translated.','One version must be objectively superior in every respect.','Both versions preserved every feature of the source equally.','Changing sentence structure necessarily changes every idea in a poem.'],
 ['The ecologist established a permanent insect decline with one survey.','Mowing increased the number of insects counted immediately afterward.','The planned surveys were intended to measure a different meadow.','The insect population is certain to recover completely.','Mowing necessarily affects every insect species in the same way.','The first survey proves that no insects remained in the meadow.'],
 ['The revised robot performed more kinds of tasks but jammed more often.','Adding moving parts solved the team’s reliability problem.','The redesign improved task variety without changing reliability.','Simpler robots are always better for every possible task.','The final robot could perform every task of the original machine.','The redesign guarantees that the machine will never fail again.'],
 ['The historian accepted the first newspaper account without comparison.','The private letters proved that newspapers never contain useful evidence.','The two newspapers described different events rather than the same one.','Every disagreement between sources proves deliberate dishonesty.','Meeting minutes always provide a complete and unbiased account.','The historian had no need to examine evidence beyond the newspapers.'],
 ['The students’ different methods led to different final answers.','Explaining methods prevented classmates from identifying connections.','Only one method was discussed because the other was incorrect.','Different valid methods can never share a mathematical idea.','The students needed identical steps to reach the same correct answer.','Reaching the correct answer means there is nothing further to learn.'],
 ['A single flower species provided blooms over the entire season.','All planted species bloomed at exactly the same time.','The group selected species without regard to their flowering times.','The planting guarantees that flowers are available every day of the year.','Every native species blooms longer than every nonnative species.','Having more species necessarily increases the size of each flower.'],
 ['The designer changed the package without first observing users.','Making the tab harder to see improved the opening process.','The second trial tested the package’s shipping strength rather than its opening point.','Every user in the second trial opened the package in the same amount of time.','The revision proves that no further usability improvements are possible.','A larger tab guarantees that any package is easier to open in all situations.']
];
for (let i=0;i<readings.length;i++) {
  const [passage,main,inference,hint] = readings[i];
  const wrongMain = readingDistractors[i].slice(0,3);
  add('Reading & Writing','Information & Ideas','Central ideas','Medium','Which choice best states the main idea of the text?',[main,...wrongMain],main,`The passage’s details support this central idea: ${main} The other choices discuss claims that the passage does not develop.`,hint,passage);
  const wrongInference = readingDistractors[i].slice(3,6);
  add('Reading & Writing','Information & Ideas','Inferences','Hard','Which conclusion is most strongly supported by the text?',[inference,...wrongInference],inference,`The best-supported conclusion is: ${inference} It stays within the information provided. The other choices make absolute claims the text cannot support.`,hint,passage);
}

// These scaffolds deliberately omit final answers and full worked solutions.
// Only these steps, the stem, and the student's incorrect answer reach the tutor worker.
const scaffolds = {
 'Linear equations':['Equivalent equations keep the same solution when you apply an operation to both sides.','Check that you undo addition before undoing multiplication.','Write the equation after subtracting the constant term from both sides; leave the division for later.'],
 'Systems of equations':['Elimination combines equations to remove a variable.','Check whether you added the entire left and right sides, including each variable.','Stack the equations and add their left sides and right sides. Leave the remaining division unfinished.'],
 'Linear functions':['A function rule transforms an input into an output.','Check whether the negative constant kept its sign when you substituted the input.','Replace x with the input inside parentheses. Write the multiplication before calculating it.'],
 'Slope':['Slope compares vertical change with horizontal change.','Check whether you used rise divided by run, with both differences in the same point order.','Label the coordinates x₁, y₁, x₂, and y₂. Set up (y₂ − y₁)/(x₂ − x₁) without simplifying.'],
 'Linear inequalities':['The same operation must be applied to each side of an inequality. A negative divisor reverses its direction.','Check the sign of the number you divide by before deciding whether to reverse the inequality.','Move the constant term by applying its opposite operation to both sides. Do not divide yet.'],
 'Linear word problems':['A fixed fee is paid once; a rate is multiplied by the number of units.','Check whether you removed the starting fee before dividing by the hourly rate.','Write total cost = starting fee + hourly rate × hours. Substitute the amounts, leaving hours unknown.'],
 'Quadratic equations':['If a product equals zero, at least one factor must equal zero.','Check the sign when moving a constant from inside a factor to the other side.','Write one equation for each factor set equal to zero. Do not solve them yet.'],
 'Quadratic functions':['A squared real quantity cannot be negative. Vertex form helps identify where a quadratic reaches an extreme.','Check whether you found an input or an output; the question asks about a function value.','Identify which part is squared, and think about the smallest that squared part alone can be.'],
 'Exponents':['Products with the same base can be rewritten using exponent laws.','Check whether you confused multiplying powers with raising a power to another power.','Write the two exponents beside each other with the operation used for a product of like bases. Leave it unevaluated.'],
 'Equivalent expressions':['A difference of squares factors into a product of a sum and a difference.','Cancel only complete common factors, never individual terms inside a sum or difference.','Factor the numerator using u² − v² = (u − v)(u + v), without canceling yet.'],
 'Polynomial expressions':['Distributing each term creates four products before like terms are combined.','Check whether you used the constant product instead of the coefficient of the x term.','Draw a two-by-two multiplication grid for the binomials. Label which products will contain exactly one x.'],
 'Absolute value':['An absolute value describes distance from a point on a number line.','Check that you considered points on both sides of the center, rather than only one solution.','Write two equations: x minus the center equals the positive distance, or its negative. Do not solve yet.'],
 'Percentages':['A percent is a fraction out of one hundred; a discounted price is what remains.','Check whether your choice represents the discount amount rather than the final price.','Write the discount as (percent/100) × original price, leaving the product unevaluated.'],
 'Statistics':['The arithmetic mean divides the sum of values by how many values there are.','Check whether you divided the total by the number of observations.','Write an addition expression containing every data value. Count how many terms you included.'],
 'Probability':['For equally likely outcomes, probability is favorable outcomes divided by all outcomes.','Check whether your denominator includes every color, not just the desired color.','List all the category counts and set up their sum as the denominator. Do not evaluate the fraction yet.'],
 'Ratios':['A ratio divides a total into proportional parts.','Check whether you assigned the correct number of parts to the group the question asks about.','Add the ratio parts, then write total divided by that number to represent the value of one part.'],
 'Rates and units':['A rate compares quantities using a stated unit of time.','Check whether your time unit matches kilometers per hour rather than kilometers per minute.','Write the time in hours as minutes divided by 60, leaving the expression unevaluated.'],
 'Right triangles':['In a right triangle, the squares of the legs add to the square of the hypotenuse.','Check whether you added lengths instead of squares, or forgot the final square root.','Label the two legs a and b, then set up a² + b² = c² without evaluating it.'],
 'Circles':['A circle’s area and circumference describe different measurements.','Check whether your expression measures a surface in square units or a boundary in units.','Write A = πr² and identify the radius in the stem. Substitute it without evaluating the square.'],
 'Similar triangles':['Corresponding sides of similar triangles share a single scale factor.','Check that both ratios compare larger to smaller, or both smaller to larger.','Pair the two known corresponding sides and write a ratio for their lengths without simplifying.'],
 'Words in context':['A word’s meaning depends on how it functions in its sentence.','Your choice needs to fit the specific clues in this sentence, not just a possible dictionary meaning.','Cover the target word and underline the nearby detail that explains or contrasts with it.'],
 'Transitions':['Transitions express relationships such as contrast, addition, illustration, or result.','Check the logical relationship your choice signals against the relationship between these particular sentences.','Describe the connection between the sentences in your own words without choosing a transition yet.'],
 'Subject–verb agreement':['A verb agrees with its grammatical subject, not with a nearby noun.','Check whether you matched the verb to a noun inside a descriptive phrase rather than to the subject.','Underline the subject and temporarily cross out descriptive phrases between it and the blank.'],
 'Sentence boundaries':['Independent clauses each contain a subject and a verb and can stand alone.','Check whether your punctuation joins two complete sentences using only a comma or no punctuation.','Mark the subject and verb on each side of the blank, then test whether each side stands alone.'],
 'Agreement with each':['The word “each” treats members of a group one at a time.','Check whether the plural noun in the “of” phrase distracted you from the actual subject.','Put brackets around the “of” phrase and identify the subject outside those brackets.'],
 'Parallel structure':['Items in a grammatical series generally use matching forms.','Check whether the form you selected matches the other actions in the list.','Circle the endings of the action words before and after the blank. Describe their shared form.'],
 'Nonessential clauses':['A nonessential clause interrupts a sentence without supplying information needed to identify its subject.','Check whether you marked both ends of the interrupting clause rather than just its end.','Temporarily remove the “which” clause and read the remaining main sentence.'],
 'Central ideas':['A central idea should account for the main details across the whole passage.','Check whether your choice stays with this passage’s topic and covers its purpose without adding new claims.','Write a short note about what changes or is compared in the passage, without selecting an option yet.'],
 'Inferences':['A supported inference follows from the text without requiring an extra assumption.','Check whether your choice uses absolute words such as “all,” “never,” or “no” that the passage cannot justify.','Underline the observed facts and distinguish them from questions the passage leaves open.']
};
for(const q of bank) {
  const [concept, check, firstStep] = scaffolds[q.skill];
  q.tutorSteps={concept,check,firstStep};
  q.workedSteps=[firstStep,q.explanation];
  q.distractorNotes=q.choices.filter((_,i)=>i!==q.answer).map(choice=>q.subject==='Math'?`The alternative ${choice} represents a different operation, quantity, or sign; it does not satisfy this item’s requested result.`:`The alternative “${choice}” does not match the passage’s specific meaning, logical relationship, or grammatical structure.`);
}

const archived=rewriteHardMath(bank);
enrichBank(bank);enrichBank(archived);
writeFileSync(new URL('../dist/archived-questions.js',import.meta.url),`// Retired item revisions retained only for historical results.\nexport const archivedQuestions = ${JSON.stringify(archived)};\n`);

// Interleave the bank so mixed practice includes both subjects from the start.
for (let i=bank.length-1;i>0;i--) {const j=Math.floor(random()*(i+1));[bank[i],bank[j]]=[bank[j],bank[i]];}
if(bank.length!==500) throw Error(`Expected 500 questions, received ${bank.length}`);
const validation=validateBank(bank);
if(validation.failures.length){for(const failure of validation.failures)console.error(`[BANK QUALITY] ${failure}`);throw Error(`${validation.failures.length} bank-quality checks failed.`);}
writeFileSync(new URL('../dist/questions.js',import.meta.url),`// 500 original SAT-style practice questions. Generated from scripts/generate-bank.mjs.\nexport const questions = ${JSON.stringify(bank)};\n`);
writeFileSync(new URL('../dist/tutor-bank.js',import.meta.url),`// Answer-free stems only: used to enforce the tutor’s bank-only scope.\nexport const allowedTutorQuestions = new Set(${JSON.stringify([...bank,...archived].map(q=>[q.passage,...q.equations,q.prompt].filter(Boolean).join('\n\n')))});\n`);
const wordCount=s=>s.trim().split(/\s+/).length;
const stats={totalQuestions:bank.length,totalSkills:new Set(bank.map(q=>q.skill)).size,skillsCovered:[...new Set(bank.map(q=>q.skill))].sort(),subjects:Object.fromEntries([...new Set(bank.map(q=>q.subject))].map(s=>[s,bank.filter(q=>q.subject===s).length])),domains:Object.fromEntries([...new Set(bank.map(q=>q.domain))].map(s=>[s,bank.filter(q=>q.domain===s).length])),averageExplanationLength:{words:Number((bank.reduce((n,q)=>n+wordCount(q.workedSteps.join(' ')),0)/bank.length).toFixed(1)),characters:Number((bank.reduce((n,q)=>n+q.workedSteps.join(' ').length,0)/bank.length).toFixed(1))},validation:{passed:validation.checked,failures:0,scope:'Structural checks, duplicate detection, distinct-option and numeric-equivalence checks; distractor plausibility requires editorial judgment.'},hardMath:{total:45,minimumWorkedSteps:3,minimumCombinedSkills:2,archivedRevisions:archived.length},totalSkillTags:new Set(bank.flatMap(q=>[q.skill,...q.skills])).size,scoring:{...IRT_MODEL,prediction:null,personalEstimates:'Saved per local profile and included in the student stats.json export, never written into the public static file.'},content:'Original SAT-style items, including parameter variants; not official or psychometrically calibrated.'};
for(const file of ['../stats.json','../dist/stats.json'])writeFileSync(new URL(file,import.meta.url),JSON.stringify(stats,null,2)+'\n');
writeFileSync(new URL('../dist/bank-stats.js',import.meta.url),`export const bankStats = ${JSON.stringify(stats)};\n`);
console.log(`Generated ${bank.length} original practice questions, including 45 rewritten multi-skill hard math items.`);
