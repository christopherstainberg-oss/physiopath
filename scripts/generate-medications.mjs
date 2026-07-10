/* =====================================================================
   PhysioPath — medication database generator
   Produces data/medications.js -> window.MEDICATIONS = [ ... ]
   Each entry: { id, name, generic, brand|null, cls, flags:[..], strength|null, form|null }
   Built from drug classes × generic names × brands × strengths/forms.
   `flags` mark exercise-relevant effects (used by the app for safety notes).
   Educational reference only — NOT prescribing advice.
===================================================================== */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
const OUT = `${dirname(fileURLToPath(import.meta.url))}/../data/medications.js`;

// common strength sets (mg unless noted)
const S = {
  bb:["12.5 mg","25 mg","50 mg","75 mg","100 mg","150 mg","200 mg"],
  ace:["2.5 mg","5 mg","10 mg","20 mg","30 mg","40 mg"],
  arb:["20 mg","40 mg","80 mg","150 mg","160 mg","300 mg","320 mg"],
  ccb:["2.5 mg","5 mg","10 mg","30 mg","60 mg","90 mg","120 mg","180 mg","240 mg"],
  diur:["12.5 mg","25 mg","40 mg","50 mg","80 mg","100 mg"],
  nitrate:["0.4 mg","10 mg","20 mg","30 mg","40 mg","60 mg"],
  arrhythmia:["50 mg","100 mg","150 mg","200 mg","300 mg","400 mg"],
  statin:["5 mg","10 mg","20 mg","40 mg","80 mg"],
  lipid:["10 mg","48 mg","54 mg","145 mg","160 mg","600 mg"],
  anticoag:["1 mg","2 mg","2.5 mg","3 mg","5 mg","7.5 mg","10 mg","15 mg","20 mg"],
  antiplt:["75 mg","81 mg","90 mg","162 mg","325 mg"],
  insulin:["100 units/mL","200 units/mL","300 units/mL"],
  sulf:["1 mg","2 mg","4 mg","5 mg","10 mg","0.5 mg","1.5 mg"],
  metf:["500 mg","750 mg","850 mg","1000 mg"],
  glp1:["0.25 mg","0.5 mg","1 mg","1.5 mg","2 mg","3 mg","7 mg","14 mg"],
  sglt2:["5 mg","10 mg","12.5 mg","25 mg","100 mg","150 mg","300 mg"],
  nsaid:["100 mg","200 mg","250 mg","400 mg","500 mg","550 mg","600 mg","800 mg"],
  apap:["325 mg","500 mg","650 mg"],
  opioid:["2.5 mg","5 mg","7.5 mg","10 mg","15 mg","20 mg","30 mg","40 mg"],
  relax:["5 mg","10 mg","250 mg","350 mg","500 mg","750 mg","800 mg"],
  gaba:["25 mg","50 mg","75 mg","100 mg","150 mg","300 mg","400 mg","600 mg","800 mg"],
  steroid:["1 mg","2.5 mg","4 mg","5 mg","10 mg","16 mg","20 mg","40 mg"],
  inh:["metered-dose inhaler","dry-powder inhaler"],
  ssri:["5 mg","10 mg","20 mg","25 mg","37.5 mg","50 mg","75 mg","100 mg","150 mg"],
  benzo:["0.25 mg","0.5 mg","1 mg","2 mg","5 mg","10 mg"],
  antipsy:["0.5 mg","1 mg","2 mg","5 mg","10 mg","25 mg","50 mg","100 mg","150 mg","300 mg"],
  aed:["25 mg","100 mg","200 mg","250 mg","300 mg","500 mg","750 mg","1000 mg"],
  pd:["25/100 mg","10/100 mg","25/250 mg","0.125 mg","0.25 mg","0.5 mg","1 mg","2 mg","4 mg"],
  ppi:["10 mg","15 mg","20 mg","30 mg","40 mg"],
  antih:["5 mg","10 mg","25 mg","30 mg","60 mg","180 mg"],
  fq:["250 mg","500 mg","750 mg"],
  bisph:["5 mg","35 mg","70 mg","150 mg"],
  gout:["100 mg","300 mg","40 mg","80 mg","0.6 mg"],
  thyroid:["25 mcg","50 mcg","75 mcg","88 mcg","100 mcg","112 mcg","125 mcg","150 mcg"],
  dmard:["2.5 mg","5 mg","7.5 mg","10 mg","15 mg","20 mg","200 mg","500 mg"],
  abx:["100 mg","250 mg","400 mg","500 mg","875 mg"],
  generic5:["1 mg","2 mg","4 mg","5 mg","10 mg","20 mg","25 mg","50 mg","100 mg"]
};
S.dpp4=S.generic5;
const TAB=["tablet","extended-release tablet"], CAP=["capsule","extended-release capsule"], TABCAP=["tablet","capsule","extended-release tablet"];

/* class: {cls, flags, str, forms, drugs:[[generic,[brands]],...]} */
const CLASSES = [
  {cls:"Beta-blocker",flags:["beta_blocker"],str:S.bb,forms:TAB,drugs:[
    ["Metoprolol",["Lopressor","Toprol XL"]],["Atenolol",["Tenormin"]],["Bisoprolol",["Zebeta"]],["Carvedilol",["Coreg"]],
    ["Nebivolol",["Bystolic"]],["Propranolol",["Inderal","Inderal LA"]],["Nadolol",["Corgard"]],["Labetalol",["Trandate"]],
    ["Sotalol",["Betapace"]],["Acebutolol",["Sectral"]],["Pindolol",[]],["Timolol",[]],["Betaxolol",[]]]},
  {cls:"ACE inhibitor",flags:["antihypertensive"],str:S.ace,forms:TAB,drugs:[
    ["Lisinopril",["Prinivil","Zestril"]],["Enalapril",["Vasotec"]],["Ramipril",["Altace"]],["Benazepril",["Lotensin"]],
    ["Perindopril",["Aceon"]],["Quinapril",["Accupril"]],["Captopril",["Capoten"]],["Fosinopril",[]],["Trandolapril",["Mavik"]],["Moexipril",[]]]},
  {cls:"ARB",flags:["antihypertensive"],str:S.arb,forms:TAB,drugs:[
    ["Losartan",["Cozaar"]],["Valsartan",["Diovan"]],["Olmesartan",["Benicar"]],["Telmisartan",["Micardis"]],
    ["Irbesartan",["Avapro"]],["Candesartan",["Atacand"]],["Azilsartan",["Edarbi"]],["Eprosartan",["Teveten"]]]},
  {cls:"Calcium channel blocker",flags:["antihypertensive"],str:S.ccb,forms:TABCAP,drugs:[
    ["Amlodipine",["Norvasc"]],["Diltiazem",["Cardizem","Tiazac"]],["Verapamil",["Calan","Verelan"]],["Nifedipine",["Procardia","Adalat"]],
    ["Felodipine",["Plendil"]],["Nicardipine",["Cardene"]],["Isradipine",[]],["Nisoldipine",["Sular"]]]},
  {cls:"Diuretic",flags:["diuretic"],str:S.diur,forms:TAB,drugs:[
    ["Hydrochlorothiazide",["Microzide"]],["Chlorthalidone",[]],["Furosemide",["Lasix"]],["Bumetanide",["Bumex"]],
    ["Torsemide",["Demadex"]],["Spironolactone",["Aldactone"]],["Eplerenone",["Inspra"]],["Indapamide",[]],
    ["Metolazone",["Zaroxolyn"]],["Triamterene",[]],["Amiloride",[]]]},
  {cls:"Nitrate",flags:["nitrate"],str:S.nitrate,forms:["tablet","spray","patch"],drugs:[
    ["Nitroglycerin",["Nitrostat","Nitro-Dur","Nitrolingual"]],["Isosorbide mononitrate",["Imdur"]],["Isosorbide dinitrate",["Isordil"]]]},
  {cls:"Antiarrhythmic",flags:["antiarrhythmic"],str:S.arrhythmia,forms:TAB,drugs:[
    ["Amiodarone",["Cordarone","Pacerone"]],["Digoxin",["Lanoxin"]],["Flecainide",["Tambocor"]],["Propafenone",["Rythmol"]],
    ["Dofetilide",["Tikosyn"]],["Dronedarone",["Multaq"]],["Mexiletine",[]],["Disopyramide",["Norpace"]],["Ivabradine",["Corlanor"]]]},
  {cls:"Statin",flags:["statin"],str:S.statin,forms:TAB,drugs:[
    ["Atorvastatin",["Lipitor"]],["Rosuvastatin",["Crestor"]],["Simvastatin",["Zocor"]],["Pravastatin",["Pravachol"]],
    ["Lovastatin",["Mevacor"]],["Fluvastatin",["Lescol"]],["Pitavastatin",["Livalo"]]]},
  {cls:"Lipid-lowering (other)",flags:["lipid"],str:S.lipid,forms:TAB,drugs:[
    ["Ezetimibe",["Zetia"]],["Fenofibrate",["Tricor"]],["Gemfibrozil",["Lopid"]],["Niacin",["Niaspan"]],
    ["Bempedoic acid",["Nexletol"]],["Cholestyramine",["Questran"]],["Colesevelam",["Welchol"]],["Evolocumab",["Repatha"]],["Alirocumab",["Praluent"]]]},
  {cls:"Anticoagulant (blood thinner)",flags:["anticoagulant"],str:S.anticoag,forms:TAB,drugs:[
    ["Warfarin",["Coumadin","Jantoven"]],["Apixaban",["Eliquis"]],["Rivaroxaban",["Xarelto"]],["Dabigatran",["Pradaxa"]],
    ["Edoxaban",["Savaysa"]],["Enoxaparin",["Lovenox"]],["Fondaparinux",["Arixtra"]]]},
  {cls:"Antiplatelet",flags:["antiplatelet"],str:S.antiplt,forms:TAB,drugs:[
    ["Clopidogrel",["Plavix"]],["Aspirin",["Ecotrin","Bayer"]],["Ticagrelor",["Brilinta"]],["Prasugrel",["Effient"]],
    ["Dipyridamole",["Persantine"]],["Cilostazol",["Pletal"]]]},
  {cls:"Other cardiovascular",flags:["antihypertensive"],str:S.generic5,forms:TAB,drugs:[
    ["Ranolazine",["Ranexa"]],["Sacubitril/valsartan",["Entresto"]],["Hydralazine",[]],["Clonidine",["Catapres"]],
    ["Methyldopa",[]],["Doxazosin",["Cardura"]],["Terazosin",[]],["Prazosin",["Minipress"]],["Minoxidil",[]]]},
  {cls:"Insulin",flags:["insulin"],str:S.insulin,forms:["pen","vial"],drugs:[
    ["Insulin glargine",["Lantus","Basaglar","Toujeo"]],["Insulin detemir",["Levemir"]],["Insulin degludec",["Tresiba"]],
    ["Insulin aspart",["NovoLog","Fiasp"]],["Insulin lispro",["Humalog","Admelog"]],["Insulin glulisine",["Apidra"]],
    ["Regular insulin",["Humulin R","Novolin R"]],["NPH insulin",["Humulin N","Novolin N"]]]},
  {cls:"Sulfonylurea / glinide",flags:["hypoglycemic"],str:S.sulf,forms:TAB,drugs:[
    ["Glipizide",["Glucotrol"]],["Glyburide",["DiaBeta","Glynase"]],["Glimepiride",["Amaryl"]],["Repaglinide",["Prandin"]],["Nateglinide",["Starlix"]]]},
  {cls:"Metformin / DPP-4 / TZD",flags:["diabetes"],str:S.metf,forms:TAB,drugs:[
    ["Metformin",["Glucophage","Fortamet","Glumetza"]],["Sitagliptin",["Januvia"]],["Linagliptin",["Tradjenta"]],
    ["Saxagliptin",["Onglyza"]],["Alogliptin",["Nesina"]],["Pioglitazone",["Actos"]],["Rosiglitazone",["Avandia"]]]},
  {cls:"GLP-1 agonist",flags:["diabetes"],str:S.glp1,forms:["pen"],drugs:[
    ["Semaglutide",["Ozempic","Rybelsus","Wegovy"]],["Liraglutide",["Victoza","Saxenda"]],["Dulaglutide",["Trulicity"]],
    ["Exenatide",["Byetta","Bydureon"]],["Tirzepatide",["Mounjaro","Zepbound"]]]},
  {cls:"SGLT2 inhibitor",flags:["sglt2"],str:S.sglt2,forms:TAB,drugs:[
    ["Empagliflozin",["Jardiance"]],["Dapagliflozin",["Farxiga"]],["Canagliflozin",["Invokana"]],["Ertugliflozin",["Steglatro"]]]},
  {cls:"NSAID",flags:["nsaid"],str:S.nsaid,forms:TABCAP,drugs:[
    ["Ibuprofen",["Advil","Motrin"]],["Naproxen",["Aleve","Naprosyn"]],["Diclofenac",["Voltaren","Cambia"]],["Meloxicam",["Mobic"]],
    ["Celecoxib",["Celebrex"]],["Indomethacin",["Indocin"]],["Ketorolac",["Toradol"]],["Etodolac",[]],["Nabumetone",[]],
    ["Piroxicam",["Feldene"]],["Sulindac",["Clinoril"]],["Ketoprofen",[]],["Oxaprozin",["Daypro"]],["Mefenamic acid",["Ponstel"]]]},
  {cls:"Acetaminophen",flags:["analgesic"],str:S.apap,forms:TABCAP,drugs:[["Acetaminophen",["Tylenol"]]]},
  {cls:"Opioid analgesic",flags:["opioid"],str:S.opioid,forms:TABCAP,drugs:[
    ["Oxycodone",["OxyContin","Roxicodone"]],["Hydrocodone",["Norco","Vicodin"]],["Tramadol",["Ultram"]],["Morphine",["MS Contin","Kadian"]],
    ["Hydromorphone",["Dilaudid"]],["Oxymorphone",["Opana"]],["Fentanyl",["Duragesic"]],["Codeine",[]],["Tapentadol",["Nucynta"]],
    ["Buprenorphine",["Butrans","Belbuca"]],["Methadone",["Dolophine"]],["Meperidine",["Demerol"]]]},
  {cls:"Muscle relaxant",flags:["muscle_relaxant"],str:S.relax,forms:TAB,drugs:[
    ["Cyclobenzaprine",["Flexeril","Amrix"]],["Baclofen",["Lioresal"]],["Tizanidine",["Zanaflex"]],["Methocarbamol",["Robaxin"]],
    ["Carisoprodol",["Soma"]],["Metaxalone",["Skelaxin"]],["Orphenadrine",["Norflex"]],["Chlorzoxazone",["Parafon Forte"]]]},
  {cls:"Nerve-pain medicine (gabapentinoid)",flags:["gabapentinoid"],str:S.gaba,forms:CAP,drugs:[
    ["Gabapentin",["Neurontin"]],["Pregabalin",["Lyrica"]]]},
  {cls:"Corticosteroid (oral)",flags:["corticosteroid"],str:S.steroid,forms:TAB,drugs:[
    ["Prednisone",["Deltasone","Rayos"]],["Prednisolone",["Orapred"]],["Methylprednisolone",["Medrol"]],["Dexamethasone",["Decadron"]],
    ["Hydrocortisone",["Cortef"]],["Triamcinolone",[]],["Betamethasone",[]],["Cortisone",[]]]},
  {cls:"Inhaled bronchodilator",flags:["bronchodilator"],str:S.inh,forms:["inhaler"],drugs:[
    ["Albuterol",["ProAir","Ventolin","Proventil"]],["Levalbuterol",["Xopenex"]],["Tiotropium",["Spiriva"]],["Umeclidinium",["Incruse"]],
    ["Aclidinium",["Tudorza"]],["Ipratropium",["Atrovent"]],["Salmeterol",["Serevent"]],["Formoterol",["Foradil"]]]},
  {cls:"Inhaled steroid / combo",flags:["inhaled_steroid","bronchodilator"],str:S.inh,forms:["inhaler"],drugs:[
    ["Fluticasone/salmeterol",["Advair"]],["Budesonide/formoterol",["Symbicort"]],["Fluticasone/vilanterol",["Breo Ellipta"]],
    ["Mometasone/formoterol",["Dulera"]],["Fluticasone",["Flovent"]],["Budesonide",["Pulmicort"]],["Mometasone",["Asmanex"]],["Beclomethasone",["Qvar"]]]},
  {cls:"Respiratory (other)",flags:["bronchodilator"],str:S.generic5,forms:TAB,drugs:[
    ["Montelukast",["Singulair"]],["Zafirlukast",["Accolate"]],["Theophylline",["Theo-24"]],["Roflumilast",["Daliresp"]]]},
  {cls:"SSRI/SNRI antidepressant",flags:["antidepressant"],str:S.ssri,forms:TABCAP,drugs:[
    ["Sertraline",["Zoloft"]],["Fluoxetine",["Prozac"]],["Escitalopram",["Lexapro"]],["Citalopram",["Celexa"]],["Paroxetine",["Paxil"]],
    ["Venlafaxine",["Effexor XR"]],["Desvenlafaxine",["Pristiq"]],["Duloxetine",["Cymbalta"]],["Bupropion",["Wellbutrin"]],
    ["Mirtazapine",["Remeron"]],["Vilazodone",["Viibryd"]],["Vortioxetine",["Trintellix"]]]},
  {cls:"Tricyclic / sedating antidepressant",flags:["sedative","antidepressant"],str:S.ssri,forms:TAB,drugs:[
    ["Amitriptyline",["Elavil"]],["Nortriptyline",["Pamelor"]],["Trazodone",["Desyrel"]],["Doxepin",["Silenor"]]]},
  {cls:"Benzodiazepine / sedative-hypnotic",flags:["sedative"],str:S.benzo,forms:TAB,drugs:[
    ["Alprazolam",["Xanax"]],["Lorazepam",["Ativan"]],["Clonazepam",["Klonopin"]],["Diazepam",["Valium"]],["Temazepam",["Restoril"]],
    ["Chlordiazepoxide",["Librium"]],["Oxazepam",[]],["Zolpidem",["Ambien"]],["Eszopiclone",["Lunesta"]],["Zaleplon",["Sonata"]]]},
  {cls:"Antipsychotic",flags:["antipsychotic"],str:S.antipsy,forms:TAB,drugs:[
    ["Quetiapine",["Seroquel"]],["Risperidone",["Risperdal"]],["Olanzapine",["Zyprexa"]],["Aripiprazole",["Abilify"]],
    ["Ziprasidone",["Geodon"]],["Lurasidone",["Latuda"]],["Haloperidol",["Haldol"]],["Clozapine",["Clozaril"]],["Paliperidone",["Invega"]]]},
  {cls:"Anticonvulsant",flags:["anticonvulsant"],str:S.aed,forms:TAB,drugs:[
    ["Levetiracetam",["Keppra"]],["Lamotrigine",["Lamictal"]],["Valproate",["Depakote"]],["Carbamazepine",["Tegretol"]],
    ["Oxcarbazepine",["Trileptal"]],["Topiramate",["Topamax"]],["Phenytoin",["Dilantin"]],["Lacosamide",["Vimpat"]],["Zonisamide",["Zonegran"]]]},
  {cls:"Parkinson's medicine",flags:["levodopa"],str:S.pd,forms:TAB,drugs:[
    ["Carbidopa/levodopa",["Sinemet","Rytary"]],["Pramipexole",["Mirapex"]],["Ropinirole",["Requip"]],["Rasagiline",["Azilect"]],
    ["Selegiline",["Eldepryl"]],["Amantadine",["Gocovri"]],["Rotigotine",["Neupro"]],["Entacapone",["Comtan"]],["Safinamide",["Xadago"]]]},
  {cls:"Migraine (triptan)",flags:["triptan"],str:S.generic5,forms:TAB,drugs:[
    ["Sumatriptan",["Imitrex"]],["Rizatriptan",["Maxalt"]],["Eletriptan",["Relpax"]],["Zolmitriptan",["Zomig"]],["Naratriptan",["Amerge"]]]},
  {cls:"Acid reducer (PPI/H2)",flags:["ppi"],str:S.ppi,forms:TABCAP,drugs:[
    ["Omeprazole",["Prilosec"]],["Esomeprazole",["Nexium"]],["Pantoprazole",["Protonix"]],["Lansoprazole",["Prevacid"]],
    ["Rabeprazole",["Aciphex"]],["Dexlansoprazole",["Dexilant"]],["Famotidine",["Pepcid"]],["Cimetidine",["Tagamet"]]]},
  {cls:"Antihistamine",flags:["antihistamine"],str:S.antih,forms:TABCAP,drugs:[
    ["Cetirizine",["Zyrtec"]],["Loratadine",["Claritin"]],["Fexofenadine",["Allegra"]],["Levocetirizine",["Xyzal"]],
    ["Diphenhydramine",["Benadryl"]],["Hydroxyzine",["Vistaril"]],["Meclizine",["Antivert"]]]},
  {cls:"Fluoroquinolone antibiotic",flags:["fluoroquinolone"],str:S.fq,forms:TAB,drugs:[
    ["Ciprofloxacin",["Cipro"]],["Levofloxacin",["Levaquin"]],["Moxifloxacin",["Avelox"]],["Ofloxacin",[]],["Gemifloxacin",["Factive"]]]},
  {cls:"Antibiotic (other)",flags:[],str:S.abx,forms:TABCAP,drugs:[
    ["Amoxicillin",["Amoxil"]],["Amoxicillin/clavulanate",["Augmentin"]],["Azithromycin",["Zithromax","Z-Pak"]],["Doxycycline",["Vibramycin"]],
    ["Cephalexin",["Keflex"]],["Clindamycin",["Cleocin"]],["Metronidazole",["Flagyl"]],["Nitrofurantoin",["Macrobid"]],
    ["Sulfamethoxazole/trimethoprim",["Bactrim","Septra"]],["Penicillin VK",[]],["Cefdinir",["Omnicef"]]]},
  {cls:"Osteoporosis / bone",flags:["bisphosphonate"],str:S.bisph,forms:TAB,drugs:[
    ["Alendronate",["Fosamax"]],["Risedronate",["Actonel"]],["Ibandronate",["Boniva"]],["Zoledronic acid",["Reclast"]],
    ["Denosumab",["Prolia"]],["Teriparatide",["Forteo"]],["Raloxifene",["Evista"]],["Romosozumab",["Evenity"]]]},
  {cls:"Gout medicine",flags:["gout"],str:S.gout,forms:TAB,drugs:[
    ["Allopurinol",["Zyloprim"]],["Febuxostat",["Uloric"]],["Colchicine",["Colcrys","Mitigare"]],["Probenecid",[]]]},
  {cls:"Thyroid",flags:["thyroid"],str:S.thyroid,forms:TAB,drugs:[
    ["Levothyroxine",["Synthroid","Levoxyl","Euthyrox"]],["Liothyronine",["Cytomel"]],["Methimazole",["Tapazole"]]]},
  {cls:"DMARD / immunomodulator",flags:["dmard"],str:S.dmard,forms:TAB,drugs:[
    ["Methotrexate",["Trexall","Rheumatrex"]],["Hydroxychloroquine",["Plaquenil"]],["Sulfasalazine",["Azulfidine"]],["Leflunomide",["Arava"]],
    ["Adalimumab",["Humira"]],["Etanercept",["Enbrel"]],["Infliximab",["Remicade"]],["Tofacitinib",["Xeljanz"]]]},
  {cls:"Bladder / anticholinergic",flags:["sedative"],str:S.generic5,forms:TAB,drugs:[
    ["Oxybutynin",["Ditropan"]],["Tolterodine",["Detrol"]],["Solifenacin",["Vesicare"]],["Mirabegron",["Myrbetriq"]],["Trospium",[]]]},
  {cls:"Erectile dysfunction (PDE5)",flags:["pde5"],str:S.generic5,forms:TAB,drugs:[
    ["Sildenafil",["Viagra","Revatio"]],["Tadalafil",["Cialis","Adcirca"]],["Vardenafil",["Levitra"]],["Avanafil",["Stendra"]]]}
];

const out=[]; const seen=new Set();
const slug=s=>s.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"");
function push(name, base, strength, form){
  const key=slug(name); if(seen.has(key)) return; seen.add(key);
  out.push({ id:"m"+(out.length+1), name, generic:base.generic, brand:base.brand, cls:base.cls, flags:base.flags,
    strength:strength||null, form:strength?(form||null):null });
}
// 1) base names (generic + brands), strength-agnostic
const bases=[];
for(const c of CLASSES){
  for(const [g,brands] of c.drugs){
    const gb={generic:g, brand:null, cls:c.cls, flags:c.flags, str:c.str, forms:c.forms};
    bases.push(gb); push(g, gb, null, null);
    for(const b of brands){ const bb={generic:g, brand:b, cls:c.cls, flags:c.flags, str:c.str, forms:c.forms};
      bases.push(bb); push(b, bb, null, null); }
  }
}
// 2) round-robin strength × form variants until target
const TARGET=10000;
const variants = bases.map(b=>{
  const list=[]; for(const s of b.str) for(const f of b.forms) list.push([s,f]); return {b, list, i:0};
});
let progress=true;
while(out.length<TARGET && progress){
  progress=false;
  for(const v of variants){
    if(out.length>=TARGET) break;
    if(v.i<v.list.length){
      const [s,f]=v.list[v.i++]; progress=true;
      const nm = f && f!=="tablet" ? `${v.b.brand||v.b.generic} ${s} ${f}` : `${v.b.brand||v.b.generic} ${s}`;
      push(nm, v.b, s, f);
    }
  }
}

mkdirSync(dirname(OUT),{recursive:true});
const byClass={}; out.forEach(m=>byClass[m.cls]=(byClass[m.cls]||0)+1);
const banner=`/* AUTO-GENERATED by scripts/generate-medications.mjs — do not edit by hand.
   ${out.length} medication entries (generic + brand + strength/form variants).
   Educational reference only — NOT prescribing advice. */\n`;
writeFileSync(OUT, `${banner}window.MEDICATIONS = ${JSON.stringify(out)};\n`);
console.log(`Wrote ${out.length} medications across ${CLASSES.length} classes, ${bases.length} base names`);
