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
    return { tfg: egfr, estagio: ckdStage(egfr) };
  }
  function ckdStage(g) {
    if (g >= 90) return 'G1 — normal ou alta';
    if (g >= 60) return 'G2 — levemente reduzida';
    if (g >= 45) return 'G3a — leve a moderada';
    if (g >= 30) return 'G3b — moderada a grave';
    if (g >= 15) return 'G4 — gravemente reduzida';
    return 'G5 — falência renal';
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

  /* ----------------------------------------------------------------------
     Exportação
     ---------------------------------------------------------------------- */
  var Clinical = {
    bmi: bmi, bsa: bsa, idealWeight: idealWeight, adjustedWeight: adjustedWeight,
    map: map, shockIndex: shockIndex,
    ckdEpi: ckdEpi, cockcroftGault: cockcroftGault, fena: fena,
    correctedSodium: correctedSodium, correctedCalcium: correctedCalcium,
    anionGap: anionGap, osmolality: osmolality,
    qtc: qtc, sumScore: sumScore,
    doseByWeight: doseByWeight, ivDripRate: ivDripRate,
    opioidConversion: opioidConversion, steroidConversion: steroidConversion,
    hollidaySegar: hollidaySegar,
    bmrMifflin: bmrMifflin, bmrHarris: bmrHarris, tdee: tdee, macros: macros,
    waterNeeds: waterNeeds, waistHip: waistHip, bodyFat: bodyFat,
    vetRer: vetRer, vetMer: vetMer, vetFluids: vetFluids, petAge: petAge
  };
  global.Clinical = Clinical;
  if (typeof module !== 'undefined' && module.exports) module.exports = Clinical;

})(typeof window !== 'undefined' ? window : globalThis);
