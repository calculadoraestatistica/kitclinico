/* ==========================================================================
   clinical.js — Núcleo de fórmulas e escores clínicos do Kit Clínico
   Funções puras, sem DOM. Funciona no navegador e no Node (para testes).

   FINALIDADE EDUCACIONAL. Não substitui o julgamento clínico profissional.
   Fórmulas baseadas em fontes consagradas (MDCalc, KDIGO, literatura médica).
   ========================================================================== */
(function (global) {
  'use strict';

  var num = function (x) { return typeof x === 'number' && isFinite(x); };

  /* ======================================================================
     ANTROPOMETRIA E GERAL
     ====================================================================== */

  // Índice de Massa Corporal (kg, cm)
  function bmi(o) {
    var p = o.peso, h = o.altura / 100;
    if (!num(p) || !num(o.altura) || p <= 0 || h <= 0)
      return { error: 'Informe peso e altura válidos.' };
    var v = p / (h * h);
    var faixa, cls;
    if (v < 18.5) { faixa = 'Abaixo do peso'; cls = 'warn'; }
    else if (v < 25) { faixa = 'Peso normal'; cls = 'ok'; }
    else if (v < 30) { faixa = 'Sobrepeso'; cls = 'warn'; }
    else if (v < 35) { faixa = 'Obesidade grau I'; cls = 'alert'; }
    else if (v < 40) { faixa = 'Obesidade grau II'; cls = 'alert'; }
    else { faixa = 'Obesidade grau III'; cls = 'alert'; }
    return { imc: v, faixa: faixa, cls: cls };
  }

  // Superfície corporal — Mosteller e DuBois (kg, cm)
  function bsa(o) {
    var p = o.peso, h = o.altura;
    if (!num(p) || !num(h) || p <= 0 || h <= 0)
      return { error: 'Informe peso e altura válidos.' };
    return {
      mosteller: Math.sqrt(h * p / 3600),
      dubois: 0.007184 * Math.pow(h, 0.725) * Math.pow(p, 0.425)
    };
  }

  // Peso ideal — fórmula de Devine (cm, sexo 'M'/'F')
  function idealWeight(o) {
    var h = o.altura;
    if (!num(h) || h <= 0) return { error: 'Informe a altura.' };
    var inch = h / 2.54;
    var base = o.sexo === 'F' ? 45.5 : 50;
    var pi = base + 2.3 * (inch - 60);
    if (pi < base * 0.6) pi = base; // alturas muito baixas
    return { pesoIdeal: pi };
  }

  // Peso ajustado (para obesos) — peso ideal + 0,4 × (peso atual − ideal)
  function adjustedWeight(o) {
    var iw = idealWeight(o);
    if (iw.error) return iw;
    if (!num(o.peso) || o.peso <= 0) return { error: 'Informe o peso atual.' };
    return {
      pesoIdeal: iw.pesoIdeal,
      pesoAjustado: iw.pesoIdeal + 0.4 * (o.peso - iw.pesoIdeal)
    };
  }

  // Pressão arterial média — MAP
  function map(o) {
    var s = o.pas, d = o.pad;
    if (!num(s) || !num(d) || s <= 0 || d <= 0 || d > s)
      return { error: 'Informe PAS e PAD válidas (PAS ≥ PAD).' };
    return { map: (s + 2 * d) / 3 };
  }

  // Índice de choque — FC ÷ PAS
  function shockIndex(o) {
    if (!num(o.fc) || !num(o.pas) || o.fc <= 0 || o.pas <= 0)
      return { error: 'Informe FC e PAS válidas.' };
    var si = o.fc / o.pas;
    return { indice: si, alterado: si >= 0.9 };
  }

  /* ======================================================================
     FUNÇÃO RENAL E ELETRÓLITOS
     ====================================================================== */

  // TFG estimada — CKD-EPI Creatinina 2021 (sem variável de raça)
  // creatinina mg/dL, idade anos, sexo 'M'/'F'
  function ckdEpi(o) {
    var scr = o.creatinina, age = o.idade;
    if (!num(scr) || !num(age) || scr <= 0 || age <= 0)
      return { error: 'Informe creatinina e idade válidas.' };
    var f = o.sexo === 'F';
    var k = f ? 0.7 : 0.9;
    var a = f ? -0.241 : -0.302;
    var r = scr / k;
    var egfr = 142 * Math.pow(Math.min(r, 1), a) *
               Math.pow(Math.max(r, 1), -1.200) *
               Math.pow(0.9938, age) * (f ? 1.012 : 1);
    return { tfg: egfr, estagio: ckdStage(egfr), categoriaG: ckdGCategory(egfr) };
  }
  function ckdStage(g) {
    if (g >= 90) return 'G1 — normal ou alta';
    if (g >= 60) return 'G2 — levemente reduzida';
    if (g >= 45) return 'G3a — leve a moderada';
    if (g >= 30) return 'G3b — moderada a grave';
    if (g >= 15) return 'G4 — gravemente reduzida';
    return 'G5 — falência renal';
  }
  function ckdGCategory(g) {
    if (g >= 90) return 'G1';
    if (g >= 60) return 'G2';
    if (g >= 45) return 'G3a';
    if (g >= 30) return 'G3b';
    if (g >= 15) return 'G4';
    return 'G5';
  }

  // Relação albumina/creatinina urinária — UACR (mg/g)
  // albumina em mg, creatinina em g (ou ambas no mesmo amostra de spot)
  // Aceita tambem mg/mmol (multiplica por 8.84 para converter para mg/g)
  function uacr(o) {
    var alb = o.albumina, cr = o.creatinina, unidade = o.unidade || 'mg-g';
    if (!num(alb) || !num(cr) || alb < 0 || cr <= 0)
      return { error: 'Informe albumina e creatinina urinárias válidas.' };
    var razao;
    if (unidade === 'mg-mmol') {
      // entrada ja vem como mg/mmol
      razao = alb;
      // converte para mg/g para classificar (1 mmol creatinina = 113,12 mg => 1 mg/mmol ≈ 8.84 mg/g)
      var razaoMgG = razao * 8.84;
      return { razao: razao, razaoMgG: razaoMgG, categoriaA: uacrCategory(razaoMgG), descricao: uacrDescription(razaoMgG) };
    }
    if (unidade === 'mg-L_g-L') {
      // albumina mg/L e creatinina g/L (concentracoes no mesmo spot)
      razao = alb / cr;
    } else {
      // padrao: albumina mg, creatinina g
      razao = alb / cr;
    }
    return { razao: razao, categoriaA: uacrCategory(razao), descricao: uacrDescription(razao) };
  }
  function uacrCategory(mgPerG) {
    if (mgPerG < 30) return 'A1';
    if (mgPerG <= 300) return 'A2';
    return 'A3';
  }
  function uacrDescription(mgPerG) {
    if (mgPerG < 30) return 'A1 — normal a levemente aumentada';
    if (mgPerG <= 300) return 'A2 — moderadamente aumentada (microalbuminúria)';
    return 'A3 — gravemente aumentada (macroalbuminúria)';
  }

  // Estratificacao de risco da doenca renal cronica — matriz KDIGO 2012
  // categoriaG: 'G1'..'G5' | categoriaA: 'A1'..'A3'
  // Retorna nivel de risco e conduta sugerida.
  function kdigoRisk(o) {
    var g = o.categoriaG, a = o.categoriaA;
    var risks = {
      G1:  { A1: 'baixo',     A2: 'moderado',  A3: 'alto' },
      G2:  { A1: 'baixo',     A2: 'moderado',  A3: 'alto' },
      G3a: { A1: 'moderado',  A2: 'alto',      A3: 'muito_alto' },
      G3b: { A1: 'alto',      A2: 'muito_alto', A3: 'muito_alto' },
      G4:  { A1: 'muito_alto', A2: 'muito_alto', A3: 'muito_alto' },
      G5:  { A1: 'muito_alto', A2: 'muito_alto', A3: 'muito_alto' }
    };
    var labels = {
      baixo:      { label: 'Risco baixo',      cls: 'ok',     conduta: 'Monitoramento de rotina (anual), controle de fatores de risco cardiovascular.' },
      moderado:   { label: 'Risco moderado',   cls: 'warn',   conduta: 'Reavaliação a cada 6 meses; investigar e tratar a causa; controle rigoroso da pressão e da glicemia.' },
      alto:       { label: 'Risco alto',       cls: 'alert',  conduta: 'Reavaliação trimestral; encaminhamento ao nefrologista; revisar doses de medicamentos pela TFG.' },
      muito_alto: { label: 'Risco muito alto', cls: 'alert',  conduta: 'Encaminhamento urgente ao nefrologista; planejar terapia renal substitutiva quando indicada; ajustar todos os medicamentos.' }
    };
    if (!risks[g] || !risks[g][a])
      return { error: 'Informe as categorias G (G1–G5) e A (A1–A3).' };
    var nivel = risks[g][a];
    return Object.assign({ categoriaG: g, categoriaA: a, nivel: nivel }, labels[nivel]);
  }

  // Clearance de creatinina — Cockcroft-Gault
  function cockcroftGault(o) {
    var age = o.idade, w = o.peso, scr = o.creatinina;
    if (!num(age) || !num(w) || !num(scr) || age <= 0 || w <= 0 || scr <= 0)
      return { error: 'Informe idade, peso e creatinina válidos.' };
    var crcl = (140 - age) * w / (72 * scr);
    if (o.sexo === 'F') crcl *= 0.85;
    return { clearance: crcl };
  }

  // Fração de excreção de sódio — FeNa (%)
  function fena(o) {
    var sNa = o.naSerico, uNa = o.naUrinario;
    var sCr = o.crSerica, uCr = o.crUrinaria;
    if (!num(sNa) || !num(uNa) || !num(sCr) || !num(uCr) ||
        sNa <= 0 || sCr <= 0 || uCr <= 0 || uNa < 0)
      return { error: 'Preencha os quatro valores com números válidos. Sódio sérico, creatinina sérica e creatinina urinária devem ser maiores que zero.' };
    var v = (uNa * sCr) / (sNa * uCr) * 100;
    var interp = v < 1 ? 'Padrão pré-renal (FeNa < 1%)'
               : (v > 2 ? 'Padrão de necrose tubular aguda (FeNa > 2%)'
                        : 'Faixa intermediária (FeNa 1–2%)');
    return { fena: v, interpretacao: interp };
  }

  // Sódio corrigido pela hiperglicemia.
  // fator 1,6 = Katz (clássico); fator 2,4 = Hillier (recomendado p/ glicemias altas)
  function correctedSodium(o) {
    var na = o.sodio, gli = o.glicemia;
    if (!num(na) || !num(gli)) return { error: 'Informe sódio e glicemia.' };
    var fator = num(o.fator) && o.fator > 0 ? o.fator : 1.6;
    return { sodioCorrigido: na + fator * ((gli - 100) / 100), fator: fator };
  }

  // Cálcio corrigido pela albumina (mg/dL)
  function correctedCalcium(o) {
    var ca = o.calcio, alb = o.albumina;
    if (!num(ca) || !num(alb)) return { error: 'Informe cálcio e albumina.' };
    return { calcioCorrigido: ca + 0.8 * (4 - alb) };
  }

  // Ânion gap (e corrigido pela albumina)
  function anionGap(o) {
    var na = o.sodio, cl = o.cloro, hco3 = o.bicarbonato;
    if (!num(na) || !num(cl) || !num(hco3))
      return { error: 'Informe sódio, cloro e bicarbonato.' };
    var ag = na - (cl + hco3);
    var out = { anionGap: ag };
    if (num(o.albumina)) out.corrigido = ag + 2.5 * (4 - o.albumina);
    return out;
  }

  // Osmolaridade plasmática estimada (mOsm/kg) — unidades convencionais
  function osmolality(o) {
    var na = o.sodio, gli = o.glicemia, ureia = o.ureia;
    if (!num(na) || !num(gli) || !num(ureia))
      return { error: 'Informe sódio, glicemia e ureia.' };
    return { osmolaridade: 2 * na + gli / 18 + ureia / 6 };
  }

  /* ======================================================================
     CARDIOLOGIA
     ====================================================================== */

  // QTc — Bazett e Fridericia. qt em ms, fc em bpm
  function qtc(o) {
    var qt = o.qt, fc = o.fc;
    if (!num(qt) || !num(fc) || qt <= 0 || fc <= 0)
      return { error: 'Informe o intervalo QT (ms) e a frequência cardíaca.' };
    var rr = 60 / fc; // segundos
    var bazett = qt / Math.sqrt(rr);
    var frid = qt / Math.pow(rr, 1 / 3);
    var lim = o.sexo === 'F' ? 470 : 450;
    return { bazett: bazett, fridericia: frid, prolongado: bazett > lim, limite: lim };
  }

  // Soma de pontos genérica (para escores aditivos)
  function sumScore(points) {
    var t = 0;
    for (var i = 0; i < points.length; i++) t += (+points[i] || 0);
    return t;
  }

  /* ======================================================================
     FARMACOLOGIA
     ====================================================================== */

  // Dose por peso — devolve dose total a partir de mg/kg
  function doseByWeight(o) {
    var w = o.peso, d = o.dosePorKg;
    if (!num(w) || !num(d) || w <= 0 || d <= 0)
      return { error: 'Informe o peso e a dose por kg.' };
    var total = w * d;
    var out = { doseTotal: total };
    if (num(o.concentracao) && o.concentracao > 0)
      out.volume = total / o.concentracao;
    if (num(o.doseMaxima) && o.doseMaxima > 0)
      out.excedeMax = total > o.doseMaxima;
    return out;
  }

  // Ritmo de infusão IV — gotas por minuto
  function ivDripRate(o) {
    var vol = o.volume, t = o.tempoHoras, gtt = o.fatorGotejamento || 20;
    if (!num(vol) || !num(t) || vol <= 0 || t <= 0)
      return { error: 'Informe o volume (mL) e o tempo (horas).' };
    var mlh = vol / t;
    return { mlPorHora: mlh, gotasPorMin: (vol * gtt) / (t * 60) };
  }

  // Conversão de opioides — equivalência em mg de morfina oral
  // Fatores de conversão para MME (morphine milligram equivalents) baseados
  // no CDC Clinical Practice Guideline for Prescribing Opioids (2022).
  // NOTA: metadona e fentanil transdérmico foram deliberadamente OMITIDOS.
  // A metadona tem razão de conversão não linear (varia de ~4:1 a >12:1
  // conforme a dose) e o fentanil adesivo é dosado em mcg/h, não em mg —
  // converter qualquer um deles com fator fixo é inseguro.
  var OPIOID_ORAL_MME = {     // 1 mg do fármaco = X mg de morfina oral
    morfina_oral: 1,
    morfina_iv: 3,
    codeina: 0.15,
    tramadol: 0.1,
    oxicodona: 1.5,
    hidromorfona_oral: 4,
    hidromorfona_iv: 12
  };
  function opioidConversion(o) {
    var from = o.de, to = o.para, dose = o.dose;
    if (!num(dose) || dose <= 0) return { error: 'Informe a dose atual.' };
    var fA = OPIOID_ORAL_MME[from], fB = OPIOID_ORAL_MME[to];
    if (!fA || !fB) return { error: 'Opioide não reconhecido.' };
    var mme = dose * fA;
    var equiv = mme / fB;
    // redução por tolerância cruzada incompleta (25–50%): aplica 25%
    return { mme: mme, doseEquivalente: equiv, doseSegura: equiv * 0.75 };
  }

  // Conversão de corticoides — equivalência a mg de prednisona
  var STEROID_PREDNISONE = {  // 1 mg do fármaco = X mg de prednisona
    hidrocortisona: 0.25,
    cortisona: 0.2,
    prednisona: 1,
    prednisolona: 1,
    metilprednisolona: 1.25,
    triancinolona: 1.25,
    dexametasona: 6.67,
    betametasona: 6.67
  };
  function steroidConversion(o) {
    var fA = STEROID_PREDNISONE[o.de], fB = STEROID_PREDNISONE[o.para];
    if (!num(o.dose) || o.dose <= 0) return { error: 'Informe a dose atual.' };
    if (!fA || !fB) return { error: 'Corticoide não reconhecido.' };
    return { equivalentePrednisona: o.dose * fA, doseEquivalente: o.dose * fA / fB };
  }

  /* ======================================================================
     PEDIATRIA
     ====================================================================== */

  // Necessidade hídrica de manutenção — Holliday-Segar (peso kg)
  function hollidaySegar(o) {
    var w = o.peso;
    if (!num(w) || w <= 0) return { error: 'Informe o peso da criança.' };
    var dia;
    if (w <= 10) dia = w * 100;
    else if (w <= 20) dia = 1000 + (w - 10) * 50;
    else dia = 1500 + (w - 20) * 20;
    return { mlPorDia: dia, mlPorHora: dia / 24 };
  }

  /* ======================================================================
     NUTRIÇÃO
     ====================================================================== */

  // Taxa metabólica basal — Mifflin-St Jeor
  function bmrMifflin(o) {
    var w = o.peso, h = o.altura, age = o.idade;
    if (!num(w) || !num(h) || !num(age) || w <= 0 || h <= 0 || age <= 0)
      return { error: 'Informe peso, altura e idade.' };
    var b = 10 * w + 6.25 * h - 5 * age;
    return { tmb: o.sexo === 'F' ? b - 161 : b + 5 };
  }

  // Taxa metabólica basal — Harris-Benedict (revisada, 1984)
  function bmrHarris(o) {
    var w = o.peso, h = o.altura, age = o.idade;
    if (!num(w) || !num(h) || !num(age) || w <= 0 || h <= 0 || age <= 0)
      return { error: 'Informe peso, altura e idade.' };
    var tmb = o.sexo === 'F'
      ? 447.593 + 9.247 * w + 3.098 * h - 4.330 * age
      : 88.362 + 13.397 * w + 4.799 * h - 5.677 * age;
    return { tmb: tmb };
  }

  // Gasto energético total — TMB × fator de atividade
  function tdee(o) {
    if (!num(o.tmb) || !num(o.fator) || o.tmb <= 0 || o.fator <= 0)
      return { error: 'Informe a TMB e o fator de atividade.' };
    return { get: o.tmb * o.fator };
  }

  // Distribuição de macronutrientes (% de calorias -> gramas)
  function macros(o) {
    var cal = o.calorias, pP = o.pctProteina, pC = o.pctCarbo, pG = o.pctGordura;
    if (!num(cal) || cal <= 0) return { error: 'Informe as calorias-alvo.' };
    if (!num(pP) || !num(pC) || !num(pG) ||
        pP < 0 || pC < 0 || pG < 0 || pP > 100 || pC > 100 || pG > 100)
      return { error: 'Cada porcentagem deve estar entre 0% e 100%.' };
    if (Math.abs((pP + pC + pG) - 100) > 0.5)
      return { error: 'As porcentagens de proteína, carboidrato e gordura devem somar 100%.' };
    return {
      proteinaG: cal * pP / 100 / 4,
      carboG: cal * pC / 100 / 4,
      gorduraG: cal * pG / 100 / 9
    };
  }

  // Necessidade hídrica diária do adulto (35 mL/kg como referência)
  function waterNeeds(o) {
    if (!num(o.peso) || o.peso <= 0) return { error: 'Informe o peso.' };
    var ml = o.peso * (o.mlPorKg || 35);
    return { mlPorDia: ml, litros: ml / 1000 };
  }

  // Relação cintura-quadril
  function waistHip(o) {
    var c = o.cintura, q = o.quadril;
    if (!num(c) || !num(q) || c <= 0 || q <= 0)
      return { error: 'Informe cintura e quadril.' };
    var r = c / q;
    var limite = o.sexo === 'F' ? 0.85 : 0.90;
    return { rcq: r, riscoElevado: r > limite, limite: limite };
  }

  // Percentual de gordura corporal — equação de Deurenberg (via IMC)
  function bodyFat(o) {
    var b = bmi({ peso: o.peso, altura: o.altura });
    if (b.error) return b;
    if (!num(o.idade)) return { error: 'Informe a idade.' };
    var sexo = o.sexo === 'F' ? 0 : 1;
    var pct = 1.20 * b.imc + 0.23 * o.idade - 10.8 * sexo - 5.4;
    return { imc: b.imc, percentualGordura: pct };
  }

  /* ======================================================================
     VETERINÁRIA
     ====================================================================== */

  // Necessidade energética de repouso (RER) — kcal/dia
  function vetRer(o) {
    if (!num(o.peso) || o.peso <= 0) return { error: 'Informe o peso do animal.' };
    return { rer: 70 * Math.pow(o.peso, 0.75) };
  }

  // Necessidade energética de manutenção (MER) = RER × fator
  function vetMer(o) {
    var r = vetRer(o);
    if (r.error) return r;
    if (!num(o.fator) || o.fator <= 0) return { error: 'Selecione a condição do animal.' };
    return { rer: r.rer, mer: r.rer * o.fator };
  }

  // Fluidoterapia — manutenção + reposição de desidratação (cão/gato)
  function vetFluids(o) {
    var w = o.peso;
    var des = num(o.desidratacao) ? o.desidratacao : 0; // % de desidratação
    if (!num(w) || w <= 0) return { error: 'Informe o peso do animal.' };
    if (des < 0 || des > 15)
      return { error: 'O grau de desidratação deve estar entre 0% e 15%.' };
    var manut = w * (o.mlKgDia || 50);          // mL/dia
    var deficit = des / 100 * w * 1000;          // mL
    return {
      manutencaoDia: manut,
      deficit: deficit,
      total24h: manut + deficit,
      mlPorHora: (manut + deficit) / 24
    };
  }

  // Conversão de idade de cães/gatos para "anos humanos" (aproximação AVMA)
  function petAge(o) {
    var a = o.idade, esp = o.especie, porte = o.porte;
    if (!num(a) || a <= 0) return { error: 'Informe a idade do animal.' };
    var humana;
    if (esp === 'gato') {
      humana = a <= 1 ? a * 15 : (a <= 2 ? 24 : 24 + (a - 2) * 4);
    } else {
      var p4 = { pequeno: 4, medio: 5, grande: 6 }[porte] || 5;
      humana = a <= 1 ? 15 : (a <= 2 ? 24 : 24 + (a - 2) * p4);
    }
    return { idadeHumana: humana };
  }

  /* ======================================================================
     ESCORES E ÍNDICES CLÍNICOS
     ====================================================================== */

  // Escala de Coma de Glasgow — ocular (1-4), verbal (1-5), motora (1-6)
  function glasgow(o) {
    var oc = o.ocular, ve = o.verbal, mo = o.motor;
    if (!num(oc) || !num(ve) || !num(mo))
      return { error: 'Selecione a resposta ocular, verbal e motora.' };
    var t = oc + ve + mo;
    var grav, cls;
    if (t <= 8) { grav = 'Rebaixamento grave do nível de consciência'; cls = 'alert'; }
    else if (t <= 12) { grav = 'Rebaixamento moderado'; cls = 'warn'; }
    else { grav = 'Rebaixamento leve ou ausente'; cls = 'ok'; }
    return { total: t, gravidade: grav, cls: cls };
  }

  // CHA2DS2-VASc — risco de AVC na fibrilação atrial não valvar
  // Risco anual de AVC/tromboembolismo (%) por pontuação (Friberg et al., 2012)
  var CHADSVASC_RISK = {
    0: 0.2, 1: 0.6, 2: 2.2, 3: 3.2, 4: 4.8, 5: 7.2, 6: 9.7, 7: 11.2, 8: 10.8, 9: 12.2
  };
  function cha2ds2vasc(o) {
    if (!num(o.idade) || o.idade < 0) return { error: 'Informe a idade do paciente.' };
    var p = 0;
    if (o.icc) p += 1;
    if (o.hipertensao) p += 1;
    if (o.idade >= 75) p += 2; else if (o.idade >= 65) p += 1;
    if (o.diabetes) p += 1;
    if (o.avc) p += 2;
    if (o.vascular) p += 1;
    if (o.sexo === 'F') p += 1;
    var cls = p >= 2 ? 'alert' : (p === 1 ? 'warn' : 'ok');
    return { total: p, riscoAnual: CHADSVASC_RISK[p], cls: cls };
  }

  // HAS-BLED — risco de sangramento maior em anticoagulação
  function hasbled(o) {
    var p = 0;
    ['hipertensao', 'renal', 'hepatica', 'avc', 'sangramento',
     'inrLabil', 'idoso', 'drogas', 'alcool'].forEach(function (k) {
      if (o[k]) p += 1;
    });
    var risco, cls;
    if (p >= 3) { risco = 'Risco alto de sangramento — cautela e reavaliação'; cls = 'alert'; }
    else { risco = 'Risco baixo a moderado de sangramento'; cls = 'ok'; }
    return { total: p, risco: risco, cls: cls };
  }

  // Escore de Wells — probabilidade de Trombose Venosa Profunda
  function wellsDvt(o) {
    var p = 0;
    ['cancer', 'paralisia', 'acamado', 'dorTrajeto', 'edemaPerna',
     'panturrilha', 'cacifo', 'colaterais', 'tvpPrevia'].forEach(function (k) {
      if (o[k]) p += 1;
    });
    if (o.diagAlternativo) p -= 2;
    var prob, cls;
    if (p >= 3) { prob = 'Probabilidade alta de TVP'; cls = 'alert'; }
    else if (p >= 1) { prob = 'Probabilidade moderada de TVP'; cls = 'warn'; }
    else { prob = 'Probabilidade baixa de TVP'; cls = 'ok'; }
    return { total: p, probabilidade: prob, cls: cls };
  }

  // Escore de Wells — probabilidade de Tromboembolismo Pulmonar
  function wellsPe(o) {
    var p = 0;
    if (o.sinaisTvp) p += 3;
    if (o.tepProvavel) p += 3;
    if (o.taquicardia) p += 1.5;
    if (o.imobilizacao) p += 1.5;
    if (o.tevPrevio) p += 1.5;
    if (o.hemoptise) p += 1;
    if (o.cancer) p += 1;
    var prob, cls;
    if (p > 4) { prob = 'TEP provável (escore > 4)'; cls = 'alert'; }
    else { prob = 'TEP improvável (escore ≤ 4)'; cls = 'ok'; }
    return { total: p, probabilidade: prob, cls: cls };
  }

  // CURB-65 — gravidade da pneumonia adquirida na comunidade
  function curb65(o) {
    var p = 0;
    ['confusao', 'ureia', 'fr', 'pressao', 'idade'].forEach(function (k) {
      if (o[k]) p += 1;
    });
    var conduta, cls;
    if (p <= 1) { conduta = 'Baixa gravidade — tratamento ambulatorial costuma ser possível'; cls = 'ok'; }
    else if (p === 2) { conduta = 'Gravidade intermediária — considerar internação hospitalar'; cls = 'warn'; }
    else { conduta = 'Alta gravidade — internação; avaliar UTI quando 4 a 5 pontos'; cls = 'alert'; }
    return { total: p, conduta: conduta, cls: cls };
  }

  // Índice de Apgar do recém-nascido — 5 itens de 0 a 2
  function apgar(o) {
    var a = o.aparencia, p = o.pulso, g = o.gesticulacao,
        at = o.atividade, r = o.respiracao;
    if (!num(a) || !num(p) || !num(g) || !num(at) || !num(r))
      return { error: 'Selecione os cinco itens do índice.' };
    var t = a + p + g + at + r;
    var interp, cls;
    if (t <= 3) { interp = 'Vitalidade gravemente deprimida'; cls = 'alert'; }
    else if (t <= 6) { interp = 'Vitalidade moderadamente deprimida'; cls = 'warn'; }
    else { interp = 'Boa vitalidade'; cls = 'ok'; }
    return { total: t, interpretacao: interp, cls: cls };
  }

  // MELD-Na — gravidade da doença hepática crônica (modelo OPTN, 2016)
  function meldNa(o) {
    var bili = o.bilirrubina, inr = o.inr, cr = o.creatinina, na = o.sodio;
    if (!num(bili) || !num(inr) || !num(cr) || !num(na))
      return { error: 'Informe bilirrubina, INR, creatinina e sódio.' };
    if (bili <= 0 || inr <= 0 || cr <= 0 || na <= 0)
      return { error: 'Os valores laboratoriais devem ser maiores que zero.' };
    var b = Math.max(bili, 1), i = Math.max(inr, 1), c = Math.max(cr, 1);
    if (o.dialise) c = 4.0;             // diálise ≥ 2× na última semana
    c = Math.min(c, 4.0);
    var meld = Math.round(3.78 * Math.log(b) + 11.2 * Math.log(i) +
                          9.57 * Math.log(c) + 6.43);
    if (meld < 6) meld = 6;
    var meldna = meld;
    if (meld > 11) {
      var naB = Math.min(Math.max(na, 125), 137);
      meldna = meld + 1.32 * (137 - naB) - (0.033 * meld * (137 - naB));
    }
    meldna = Math.round(meldna);
    if (meldna > 40) meldna = 40;
    if (meldna < 6) meldna = 6;
    var mort = meldna >= 30 ? '≈ 50% ou mais'
             : (meldna >= 20 ? '≈ 20%' : (meldna >= 10 ? '≈ 6%' : '≈ 2%'));
    return { meld: meld, meldNa: meldna, mortalidade90d: mort };
  }

  // Classificação de Child-Pugh da cirrose hepática
  function childPugh(o) {
    var bili = o.bilirrubina, alb = o.albumina, inr = o.inr;
    if (!num(bili) || !num(alb) || !num(inr))
      return { error: 'Informe bilirrubina, albumina e INR.' };
    if (bili <= 0 || alb <= 0 || inr <= 0)
      return { error: 'Os valores laboratoriais devem ser maiores que zero.' };
    if (o.ascite !== 'ausente' && o.ascite !== 'leve' && o.ascite !== 'moderada')
      return { error: 'Selecione o grau de ascite.' };
    if (o.encefalopatia !== 'ausente' && o.encefalopatia !== 'leve' &&
        o.encefalopatia !== 'avancada')
      return { error: 'Selecione o grau de encefalopatia.' };
    var p = 0;
    p += bili < 2 ? 1 : (bili <= 3 ? 2 : 3);
    p += alb > 3.5 ? 1 : (alb >= 2.8 ? 2 : 3);
    p += inr < 1.7 ? 1 : (inr <= 2.3 ? 2 : 3);
    p += o.ascite === 'moderada' ? 3 : (o.ascite === 'leve' ? 2 : 1);
    p += o.encefalopatia === 'avancada' ? 3 : (o.encefalopatia === 'leve' ? 2 : 1);
    var classe, cls;
    if (p <= 6) { classe = 'Classe A — cirrose bem compensada'; cls = 'ok'; }
    else if (p <= 9) { classe = 'Classe B — comprometimento funcional significativo'; cls = 'warn'; }
    else { classe = 'Classe C — cirrose descompensada'; cls = 'alert'; }
    return { total: p, classe: classe, cls: cls };
  }

  // Fórmula de Parkland — reposição volêmica nas primeiras 24 h da queimadura
  function parkland(o) {
    var w = o.peso, scq = o.scq;
    if (!num(w) || !num(scq) || w <= 0 || scq <= 0)
      return { error: 'Informe o peso e a superfície corporal queimada (%).' };
    if (scq > 100) return { error: 'A superfície queimada não pode passar de 100%.' };
    var total = 4 * w * scq;
    return {
      total24h: total,
      primeiras8h: total / 2,
      restantes16h: total / 2,
      mlh8: total / 2 / 8,
      mlh16: total / 2 / 16
    };
  }

  // Fração de excreção de ureia — FeUreia (%)
  function feUrea(o) {
    var sU = o.ureiaSerica, uU = o.ureiaUrinaria;
    var sCr = o.crSerica, uCr = o.crUrinaria;
    if (!num(sU) || !num(uU) || !num(sCr) || !num(uCr) ||
        sU <= 0 || sCr <= 0 || uCr <= 0 || uU < 0)
      return { error: 'Preencha os quatro valores com números válidos. Ureia sérica, creatinina sérica e creatinina urinária devem ser maiores que zero.' };
    var v = (uU * sCr) / (sU * uCr) * 100;
    var interp, cls;
    if (v < 35) { interp = 'Padrão pré-renal (FeUreia < 35%)'; cls = 'warn'; }
    else if (v > 50) { interp = 'Padrão de necrose tubular aguda (FeUreia > 50%)'; cls = 'alert'; }
    else { interp = 'Faixa intermediária (FeUreia 35–50%)'; cls = 'warn'; }
    return { feurea: v, interpretacao: interp, cls: cls };
  }

  // Suplementação de potássio na fluidoterapia (cão/gato) — escala deslizante
  function vetPotassium(o) {
    var k = o.potassio;
    if (!num(k) || k <= 0) return { error: 'Informe o potássio sérico do animal.' };
    if (k > 5.0)
      return { mEqPorLitro: 0, alerta: true,
               mensagem: 'Potássio normal ou elevado — a suplementação não está indicada.' };
    var add;
    if (k >= 3.5) add = 20;
    else if (k >= 3.0) add = 30;
    else if (k >= 2.5) add = 40;
    else if (k >= 2.0) add = 60;
    else add = 80;
    var out = { mEqPorLitro: add };
    // Taxa de infusão de potássio não deve ultrapassar 0,5 mEq/kg/h
    if (num(o.peso) && o.peso > 0)
      out.taxaMaxMlh = (0.5 * o.peso / add) * 1000;
    return out;
  }

  /* ======================================================================
     PAINEIS CLINICOS INTEGRADOS — funcoes que combinam resultados
     ====================================================================== */

  // Anticoagulacao em FA — balanço entre risco de AVC (CHA2DS2-VASc) e
  // risco de sangramento (HAS-BLED). Indica decisao de anticoagulacao.
  function afibAnticoagPanel(o) {
    var c = o.chadsvasc, h = o.hasbled;
    if (!num(c) || !num(h) || c < 0 || h < 0)
      return { error: 'Informe os escores CHA2DS2-VASc e HAS-BLED.' };
    var sexoF = !!o.sexoF;
    var recomenda, cls, justificativa;
    // CHA2DS2-VASc cutoffs: >=2 (homem) ou >=3 (mulher) tipicamente indicam anticoagulacao
    var limiteAVC = sexoF ? 3 : 2;
    if (c < limiteAVC) {
      recomenda = 'Anticoagulação geralmente NÃO indicada';
      cls = 'ok';
      justificativa = 'Risco de AVC baixo (CHA2DS2-VASc abaixo do limiar). Reavaliar anualmente.';
    } else if (h >= 3 && c < limiteAVC + 2) {
      recomenda = 'Avaliar individualmente — risco de sangramento alto';
      cls = 'warn';
      justificativa = 'Anticoagulação indicada pelo CHA2DS2-VASc, mas HAS-BLED ≥ 3 sugere cautela. Corrigir fatores reversíveis (hipertensão, INR lábil, álcool, drogas) e reavaliar.';
    } else if (h >= 3) {
      recomenda = 'Anticoagular com vigilância — HAS-BLED elevado não contraindica';
      cls = 'warn';
      justificativa = 'Risco de AVC supera o de sangramento; o HAS-BLED alto serve para acompanhar de perto, não para suspender a anticoagulação.';
    } else {
      recomenda = 'Anticoagulação INDICADA';
      cls = 'alert';
      justificativa = 'Benefício claro: risco de AVC justifica anticoagulação e o risco de sangramento é aceitável.';
    }
    return { recomenda: recomenda, cls: cls, justificativa: justificativa,
             chadsvasc: c, hasbled: h, limiteAVC: limiteAVC };
  }

  // Padrao de LRA pre-renal vs NTA — combina FeNa e FeUreia (util quando
  // o paciente usa diuretico, em que FeNa pode estar falsamente elevada)
  function akiPattern(o) {
    var fena = o.fena, feUreia = o.feUreia;
    if (!num(fena) || !num(feUreia))
      return { error: 'Informe FeNa e FeUreia (%).' };
    var fenaBaixa = fena < 1;
    var fenaAlta  = fena > 2;
    var feuBaixa  = feUreia < 35;
    var feuAlta   = feUreia > 50;
    var padrao, cls, comentario;
    if (fenaBaixa && feuBaixa) {
      padrao = 'Padrão pré-renal';
      cls = 'ok';
      comentario = 'Ambos os marcadores indicam hipoperfusão renal. Investigar volemia (hidratar com cautela), hemorragia, sepse e ICC.';
    } else if (fenaAlta && feuAlta) {
      padrao = 'Padrão de necrose tubular aguda (NTA)';
      cls = 'alert';
      comentario = 'Ambos os marcadores indicam disfunção tubular intrínseca. Investigar causa (isquêmica, nefrotóxica) e suporte clínico.';
    } else if (fenaAlta && feuBaixa) {
      padrao = 'Padrão pré-renal mascarado por diurético';
      cls = 'warn';
      comentario = 'A FeUreia sugere pré-renal, mas a FeNa está falsamente alta pelo uso de diurético. Em pacientes em uso de furosemida, a FeUreia é o marcador mais confiável.';
    } else if (fenaBaixa && feuAlta) {
      padrao = 'Padrão discordante — investigar';
      cls = 'warn';
      comentario = 'FeNa baixa com FeUreia alta é incomum. Considerar contraste recente, nefrite intersticial, glomerulonefrite ou erro pré-analítico.';
    } else {
      padrao = 'Padrão intermediário / indeterminado';
      cls = 'warn';
      comentario = 'Os valores estão em zonas intermediárias. Avaliar evolução clínica, sedimento urinário e biomarcadores adicionais.';
    }
    return { padrao: padrao, cls: cls, comentario: comentario, fena: fena, feUreia: feUreia };
  }

  // Cirrose: combina Child-Pugh e MELD-Na em uma leitura unica de gravidade
  function cirrhosisPanel(o) {
    var meld = o.meldNa, child = o.childClasse;
    if (!num(meld) || !child) return { error: 'Informe MELD-Na e a classe Child-Pugh.' };
    var conduta, cls;
    if (meld >= 15 || child === 'C') {
      conduta = 'Avaliar lista de transplante hepático e cuidados especializados.';
      cls = 'alert';
    } else if (meld >= 10 || child === 'B') {
      conduta = 'Acompanhamento por hepatologia, prevenção de descompensações (varizes, encefalopatia, ascite) e vacinação.';
      cls = 'warn';
    } else {
      conduta = 'Cirrose compensada — monitoramento semestral, rastreio de CHC e varizes, controle de fatores agravantes.';
      cls = 'ok';
    }
    return { meld: meld, child: child, conduta: conduta, cls: cls };
  }

  // Distúrbios acido-base — combina anion gap, sodio corrigido e osmolaridade
  // para sugerir um tipo de acidose ou de disturbio osmolar.
  function acidBasePanel(o) {
    var ag = o.anionGap, naCorr = o.sodioCorrigido, osm = o.osmolaridade, osmMedida = o.osmMedida;
    if (!num(ag)) return { error: 'Informe ao menos o ânion gap.' };
    var notas = [];
    if (ag > 12) notas.push('**Acidose metabólica com ânion gap elevado** — investigar causas (MUDPILES: metanol, uremia, cetoacidose diabética, paraldeído, INH/ferro, ácido láctico, etilenoglicol, salicilatos).');
    else if (ag < 8) notas.push('Ânion gap baixo — hipoalbuminemia, mieloma, intoxicação por lítio/brometo.');
    else notas.push('Ânion gap normal.');
    if (num(naCorr)) {
      if (naCorr > 145) notas.push('**Hipernatremia corrigida** — déficit hídrico ou ganho de sódio.');
      else if (naCorr < 135) notas.push('**Hiponatremia corrigida** — avaliar volemia e osmolaridade.');
    }
    if (num(osm) && num(osmMedida)) {
      var gap = osmMedida - osm;
      notas.push('Gap osmolar: **' + gap.toFixed(0) + ' mOsm/kg**' +
        (gap > 10 ? ' — elevado: pensar em metanol, etilenoglicol, manitol.' : ' — dentro da faixa esperada.'));
    } else if (num(osm)) {
      notas.push('Osmolaridade calculada: ' + osm.toFixed(0) + ' mOsm/kg.');
    }
    return { notas: notas, anionGap: ag, sodioCorrigido: naCorr, osmolaridade: osm };
  }

  // Ajuste de dose por funcao renal — combina TFG com dose por peso
  // Aplica fator de reducao conforme faixas tipicas (esquema generico
  // KDIGO/Bennett — confirmar na bula de cada medicamento).
  function doseByTfgPanel(o) {
    var dose = o.doseTotal, tfg = o.tfg;
    if (!num(dose) || !num(tfg) || dose <= 0 || tfg <= 0)
      return { error: 'Informe a dose habitual e a TFG.' };
    var fator, faixa, observacao;
    if (tfg >= 60) { fator = 1.0;  faixa = 'TFG ≥ 60';     observacao = 'Função renal normal ou levemente reduzida — dose habitual.'; }
    else if (tfg >= 30) { fator = 0.75; faixa = 'TFG 30–59'; observacao = 'Redução moderada — considerar 50–75% da dose ou ampliar intervalo (consultar bula).'; }
    else if (tfg >= 15) { fator = 0.5;  faixa = 'TFG 15–29'; observacao = 'Redução grave — geralmente 25–50% da dose ou intervalos prolongados.'; }
    else { fator = 0.25; faixa = 'TFG < 15'; observacao = 'Falência renal — muitos fármacos contraindicados; avaliar substituição e/ou diálise.'; }
    return {
      doseHabitual: dose, doseAjustada: dose * fator,
      tfg: tfg, faixa: faixa, fator: fator, observacao: observacao
    };
  }

  // Perfil metabolico — IMC + RCQ + % gordura corporal
  function metabolicProfile(o) {
    var imc = o.imc, rcq = o.rcq, gord = o.percentualGordura, sexoF = !!o.sexoF;
    var pontos = 0, notas = [];
    if (num(imc)) {
      if (imc >= 30) { pontos++; notas.push('IMC ' + imc.toFixed(1) + ' — obesidade.'); }
      else if (imc >= 25) { notas.push('IMC ' + imc.toFixed(1) + ' — sobrepeso.'); }
      else { notas.push('IMC ' + imc.toFixed(1) + ' — eutrofia/baixo peso.'); }
    }
    if (num(rcq)) {
      var limite = sexoF ? 0.85 : 0.90;
      if (rcq > limite) { pontos++; notas.push('RCQ ' + rcq.toFixed(2) + ' — distribuição central (acima de ' + limite + ').'); }
      else { notas.push('RCQ ' + rcq.toFixed(2) + ' — distribuição não-central.'); }
    }
    if (num(gord)) {
      var alta = sexoF ? 32 : 25;
      if (gord >= alta) { pontos++; notas.push('% gordura ' + gord.toFixed(1) + '% — elevada.'); }
      else { notas.push('% gordura ' + gord.toFixed(1) + '%.'); }
    }
    var perfil, cls;
    if (pontos === 0) { perfil = 'Perfil metabólico de baixo risco aparente'; cls = 'ok'; }
    else if (pontos === 1) { perfil = 'Perfil metabólico com um marcador alterado'; cls = 'warn'; }
    else { perfil = 'Perfil metabólico de risco elevado (≥ 2 marcadores alterados)'; cls = 'alert'; }
    return { perfil: perfil, cls: cls, pontos: pontos, notas: notas };
  }

  // Triagem em pneumonia — CURB-65 + sinais vitais
  function pneumoniaTriage(o) {
    var curb = o.curb, pas = o.pas, fr = o.fr, sat = o.satO2;
    if (!num(curb)) return { error: 'Informe o escore CURB-65.' };
    var local, cls, motivos = [];
    if (curb >= 3) { local = 'UTI'; cls = 'alert'; motivos.push('CURB-65 ≥ 3.'); }
    else if (curb === 2) { local = 'Enfermaria'; cls = 'warn'; motivos.push('CURB-65 = 2 sugere internação.'); }
    else { local = 'Tratamento ambulatorial'; cls = 'ok'; motivos.push('CURB-65 ≤ 1.'); }
    if (num(pas) && pas < 90) { if (local !== 'UTI') { local = 'UTI'; cls = 'alert'; } motivos.push('Hipotensão (PAS < 90 mmHg).'); }
    if (num(fr) && fr >= 30) { if (local !== 'UTI') { local = 'UTI'; cls = 'alert'; } motivos.push('Taquipneia (FR ≥ 30 irpm).'); }
    if (num(sat) && sat < 90) { if (local !== 'UTI') { local = 'UTI'; cls = 'alert'; } motivos.push('Hipoxemia (SatO₂ < 90%).'); }
    return { local: local, cls: cls, motivos: motivos, curb: curb };
  }

  // Decisao de imagem em TVP/TEP — Wells + sinais
  function tevImagingDecision(o) {
    var wells = o.wells, tipo = o.tipo, dDimero = o.dDimero;
    if (!num(wells) || !tipo) return { error: 'Informe o escore de Wells e o tipo (TVP ou TEP).' };
    var provavel;
    if (tipo === 'tvp') provavel = wells >= 2;
    else provavel = wells > 4;
    var decisao, cls, comentario;
    if (provavel) {
      decisao = 'Exame de imagem indicado';
      cls = 'alert';
      comentario = (tipo === 'tvp' ? 'US Doppler de membro inferior.' : 'Angio-TC de tórax (ou cintilografia V/Q se contraindicada).');
    } else if (num(dDimero) && dDimero <= 500) {
      decisao = 'Imagem dispensável — d-dímero negativo';
      cls = 'ok';
      comentario = 'Wells baixo + d-dímero ≤ 500 ng/mL exclui razoavelmente o evento tromboembólico.';
    } else if (num(dDimero) && dDimero > 500) {
      decisao = 'Imagem indicada — d-dímero positivo';
      cls = 'warn';
      comentario = 'Apesar de Wells baixo, d-dímero positivo exige confirmação por imagem.';
    } else {
      decisao = 'Solicitar d-dímero';
      cls = 'warn';
      comentario = 'Wells baixo: o d-dímero é o próximo passo. Se ≤ 500 ng/mL, exclui o evento; se elevado, faz imagem.';
    }
    return { decisao: decisao, cls: cls, comentario: comentario, wells: wells, tipo: tipo, provavel: provavel };
  }

  /* ----------------------------------------------------------------------
     Exportação
     ---------------------------------------------------------------------- */
  var Clinical = {
    bmi: bmi, bsa: bsa, idealWeight: idealWeight, adjustedWeight: adjustedWeight,
    map: map, shockIndex: shockIndex,
    ckdEpi: ckdEpi, cockcroftGault: cockcroftGault, fena: fena, uacr: uacr, kdigoRisk: kdigoRisk,
    correctedSodium: correctedSodium, correctedCalcium: correctedCalcium,
    anionGap: anionGap, osmolality: osmolality,
    qtc: qtc, sumScore: sumScore,
    doseByWeight: doseByWeight, ivDripRate: ivDripRate,
    opioidConversion: opioidConversion, steroidConversion: steroidConversion,
    hollidaySegar: hollidaySegar,
    bmrMifflin: bmrMifflin, bmrHarris: bmrHarris, tdee: tdee, macros: macros,
    waterNeeds: waterNeeds, waistHip: waistHip, bodyFat: bodyFat,
    vetRer: vetRer, vetMer: vetMer, vetFluids: vetFluids, petAge: petAge,
    glasgow: glasgow, cha2ds2vasc: cha2ds2vasc, hasbled: hasbled,
    wellsDvt: wellsDvt, wellsPe: wellsPe, curb65: curb65, apgar: apgar,
    meldNa: meldNa, childPugh: childPugh, parkland: parkland,
    feUrea: feUrea, vetPotassium: vetPotassium,
    // paineis integrados
    afibAnticoagPanel: afibAnticoagPanel, akiPattern: akiPattern,
    cirrhosisPanel: cirrhosisPanel, acidBasePanel: acidBasePanel,
    doseByTfgPanel: doseByTfgPanel, metabolicProfile: metabolicProfile,
    pneumoniaTriage: pneumoniaTriage, tevImagingDecision: tevImagingDecision
  };
  global.Clinical = Clinical;
  if (typeof module !== 'undefined' && module.exports) module.exports = Clinical;

})(typeof window !== 'undefined' ? window : globalThis);
