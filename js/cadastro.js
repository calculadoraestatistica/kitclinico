/* ==========================================================================
   cadastro.js — Cadastro clínico do paciente do Kit Clínico
   Funciona apenas no navegador. NENHUM dado é enviado para o servidor.
   Os exports (PDF, Excel, JSON) são gerados localmente no navegador.
   ========================================================================== */
(function (global) {
  'use strict';

  /* ------------------------------------------------------------------------
     Esquemas de cadastro por área
     ------------------------------------------------------------------------ */
  // Cada campo: { id, label, type, unit?, options?, group, required? }
  // group: 'identificacao' | 'antropometria' | 'sinais_vitais' | 'clinico' | 'lab' | 'nutricao' | 'pet'

  var COMMON_ID = [
    { id: 'nome',       label: 'Nome do paciente',  type: 'text',   group: 'identificacao' },
    { id: 'idade',      label: 'Idade',             type: 'number', unit: 'anos', group: 'identificacao' },
    { id: 'sexo',       label: 'Sexo',              type: 'select', options: [['', '—'], ['M', 'Masculino'], ['F', 'Feminino']], group: 'identificacao' },
    { id: 'data_nasc',  label: 'Data de nascimento', type: 'date',  group: 'identificacao' },
    { id: 'documento',  label: 'Documento (CPF, RG ou prontuário)', type: 'text', group: 'identificacao' },
    { id: 'telefone',   label: 'Telefone',          type: 'tel',    group: 'identificacao' },
    { id: 'email',      label: 'E-mail',            type: 'email',  group: 'identificacao' },
    { id: 'endereco',   label: 'Endereço',          type: 'text',   group: 'identificacao' },
    { id: 'cidade',     label: 'Cidade/UF',         type: 'text',   group: 'identificacao' },
    { id: 'profissao',  label: 'Profissão',         type: 'text',   group: 'identificacao' },
    { id: 'plano',      label: 'Plano / convênio',  type: 'text',   group: 'identificacao' }
  ];

  var SCHEMAS = {};

  SCHEMAS.medicina = COMMON_ID.concat([
    // Antropometria
    { id: 'peso',     label: 'Peso',     type: 'number', unit: 'kg',  group: 'antropometria' },
    { id: 'altura',   label: 'Altura',   type: 'number', unit: 'cm',  group: 'antropometria' },
    { id: 'cintura',  label: 'Circunferência abdominal', type: 'number', unit: 'cm', group: 'antropometria' },
    // Sinais vitais
    { id: 'pas',      label: 'PAS',      type: 'number', unit: 'mmHg', group: 'sinais_vitais' },
    { id: 'pad',      label: 'PAD',      type: 'number', unit: 'mmHg', group: 'sinais_vitais' },
    { id: 'fc',       label: 'FC',       type: 'number', unit: 'bpm',  group: 'sinais_vitais' },
    { id: 'fr',       label: 'FR',       type: 'number', unit: 'irpm', group: 'sinais_vitais' },
    { id: 'temp',     label: 'Temperatura', type: 'number', unit: '°C', group: 'sinais_vitais' },
    { id: 'satO2',    label: 'SatO₂',    type: 'number', unit: '%',    group: 'sinais_vitais' },
    { id: 'glasgow',  label: 'Glasgow',  type: 'number', unit: '/15',  group: 'sinais_vitais' },
    // Clínico
    { id: 'queixa',       label: 'Queixa principal', type: 'textarea', group: 'clinico' },
    { id: 'hda',          label: 'HDA — história da doença atual', type: 'textarea', group: 'clinico' },
    { id: 'antecedentes', label: 'Antecedentes pessoais', type: 'textarea', group: 'clinico' },
    { id: 'comorbidades', label: 'Comorbidades', type: 'textarea', group: 'clinico' },
    { id: 'alergias',     label: 'Alergias', type: 'text', group: 'clinico' },
    { id: 'medicacoes',   label: 'Medicações em uso', type: 'textarea', group: 'clinico' },
    { id: 'tabagismo',    label: 'Tabagismo', type: 'select', options: [['','—'], ['nao','Não'], ['ex','Ex-tabagista'], ['sim','Tabagista']], group: 'clinico' },
    { id: 'etilismo',     label: 'Etilismo', type: 'select', options: [['','—'], ['nao','Não'], ['social','Social'], ['sim','Etilista']], group: 'clinico' },
    // Laboratório
    { id: 'creatinina',   label: 'Creatinina sérica', type: 'number', unit: 'mg/dL', group: 'lab' },
    { id: 'ureia',        label: 'Ureia sérica',      type: 'number', unit: 'mg/dL', group: 'lab' },
    { id: 'sodio',        label: 'Sódio sérico',      type: 'number', unit: 'mEq/L', group: 'lab' },
    { id: 'potassio',     label: 'Potássio sérico',   type: 'number', unit: 'mEq/L', group: 'lab' },
    { id: 'cloro',        label: 'Cloro sérico',      type: 'number', unit: 'mEq/L', group: 'lab' },
    { id: 'bicarbonato',  label: 'Bicarbonato',       type: 'number', unit: 'mEq/L', group: 'lab' },
    { id: 'calcio',       label: 'Cálcio sérico',     type: 'number', unit: 'mg/dL', group: 'lab' },
    { id: 'albumina',     label: 'Albumina',          type: 'number', unit: 'g/dL',  group: 'lab' },
    { id: 'bilirrubina',  label: 'Bilirrubina total', type: 'number', unit: 'mg/dL', group: 'lab' },
    { id: 'inr',          label: 'INR',               type: 'number',                 group: 'lab' },
    { id: 'glicemia',     label: 'Glicemia',          type: 'number', unit: 'mg/dL', group: 'lab' },
    { id: 'naUrinario',   label: 'Sódio urinário',    type: 'number', unit: 'mEq/L', group: 'lab' },
    { id: 'crUrinaria',   label: 'Creatinina urinária', type: 'number', unit: 'mg/dL', group: 'lab' },
    { id: 'ureiaUrinaria',label: 'Ureia urinária',    type: 'number', unit: 'mg/dL', group: 'lab' }
  ]);

  SCHEMAS.nutricao = COMMON_ID.concat([
    { id: 'peso',     label: 'Peso',     type: 'number', unit: 'kg',  group: 'antropometria' },
    { id: 'altura',   label: 'Altura',   type: 'number', unit: 'cm',  group: 'antropometria' },
    { id: 'cintura',  label: 'Circunferência da cintura', type: 'number', unit: 'cm', group: 'antropometria' },
    { id: 'quadril',  label: 'Circunferência do quadril', type: 'number', unit: 'cm', group: 'antropometria' },
    { id: 'pesoMeta', label: 'Peso-meta', type: 'number', unit: 'kg', group: 'antropometria' },
    { id: 'objetivo', label: 'Objetivo', type: 'select', options: [['','—'], ['emagrecer','Emagrecer'], ['manter','Manter peso'], ['ganhar','Ganho de massa'], ['saude','Saúde geral']], group: 'nutricao' },
    { id: 'atividade', label: 'Nível de atividade', type: 'select', options: [['','—'], ['sedentario','Sedentário (1,2)'], ['leve','Leve (1,375)'], ['moderado','Moderado (1,55)'], ['intenso','Intenso (1,725)'], ['muito_intenso','Muito intenso (1,9)']], group: 'nutricao' },
    { id: 'refeicoes', label: 'Refeições por dia', type: 'number', group: 'nutricao' },
    { id: 'agua_meta', label: 'Meta de ingestão de água', type: 'number', unit: 'mL/dia', group: 'nutricao' },
    { id: 'preferencias', label: 'Preferências alimentares', type: 'textarea', group: 'nutricao' },
    { id: 'restricoes',   label: 'Restrições / alergias alimentares', type: 'textarea', group: 'nutricao' },
    { id: 'intestino',    label: 'Funcionamento intestinal', type: 'text', group: 'nutricao' },
    { id: 'sono',         label: 'Sono (horas/qualidade)', type: 'text', group: 'nutricao' },
    { id: 'antecedentes', label: 'Antecedentes pessoais', type: 'textarea', group: 'clinico' },
    { id: 'comorbidades', label: 'Comorbidades', type: 'textarea', group: 'clinico' },
    { id: 'medicacoes',   label: 'Medicações / suplementos', type: 'textarea', group: 'clinico' },
    { id: 'exames_relev', label: 'Exames relevantes', type: 'textarea', group: 'lab' }
  ]);

  // Para veterinária, "nome" passa a ser o nome do pet; tutor é separado.
  var VET_ID = [
    { id: 'pet_nome',    label: 'Nome do pet',      type: 'text',   group: 'identificacao' },
    { id: 'especie',     label: 'Espécie',          type: 'select', options: [['','—'], ['cao','Cão'], ['gato','Gato'], ['outro','Outro']], group: 'identificacao' },
    { id: 'raca',        label: 'Raça',             type: 'text',   group: 'identificacao' },
    { id: 'idade',       label: 'Idade',            type: 'number', unit: 'anos', group: 'identificacao' },
    { id: 'sexo_pet',    label: 'Sexo',             type: 'select', options: [['','—'], ['M','Macho'], ['F','Fêmea']], group: 'identificacao' },
    { id: 'castrado',    label: 'Castrado',         type: 'select', options: [['','—'], ['sim','Sim'], ['nao','Não']], group: 'identificacao' },
    { id: 'porte',       label: 'Porte',            type: 'select', options: [['','—'], ['pequeno','Pequeno (<10 kg)'], ['medio','Médio (10–25 kg)'], ['grande','Grande (>25 kg)']], group: 'identificacao' },
    { id: 'pelagem',     label: 'Pelagem / cor',    type: 'text',   group: 'identificacao' },
    { id: 'microchip',   label: 'Microchip',        type: 'text',   group: 'identificacao' },
    // Tutor
    { id: 'tutor_nome',  label: 'Nome do tutor',    type: 'text',   group: 'tutor' },
    { id: 'tutor_doc',   label: 'CPF do tutor',     type: 'text',   group: 'tutor' },
    { id: 'tutor_tel',   label: 'Telefone do tutor', type: 'tel',   group: 'tutor' },
    { id: 'tutor_email', label: 'E-mail do tutor',  type: 'email',  group: 'tutor' },
    { id: 'endereco',    label: 'Endereço',         type: 'text',   group: 'tutor' },
    { id: 'cidade',      label: 'Cidade/UF',        type: 'text',   group: 'tutor' }
  ];

  SCHEMAS.veterinaria = VET_ID.concat([
    { id: 'peso',          label: 'Peso atual', type: 'number', unit: 'kg', group: 'antropometria' },
    { id: 'pesoIdeal',     label: 'Peso ideal estimado', type: 'number', unit: 'kg', group: 'antropometria' },
    { id: 'temp',          label: 'Temperatura', type: 'number', unit: '°C', group: 'sinais_vitais' },
    { id: 'fc',            label: 'FC',          type: 'number', unit: 'bpm', group: 'sinais_vitais' },
    { id: 'fr',            label: 'FR',          type: 'number', unit: 'mpm', group: 'sinais_vitais' },
    { id: 'tpc',           label: 'TPC',         type: 'text',                group: 'sinais_vitais' },
    { id: 'mucosas',       label: 'Mucosas',     type: 'text',                group: 'sinais_vitais' },
    { id: 'queixa',        label: 'Queixa do tutor', type: 'textarea', group: 'clinico' },
    { id: 'historico',     label: 'Histórico / anamnese', type: 'textarea', group: 'clinico' },
    { id: 'comorbidades',  label: 'Comorbidades / doenças prévias', type: 'textarea', group: 'clinico' },
    { id: 'medicacoes',    label: 'Medicações em uso', type: 'textarea', group: 'clinico' },
    { id: 'alergias',      label: 'Alergias', type: 'text', group: 'clinico' },
    { id: 'desidratacao',  label: 'Grau de desidratação', type: 'number', unit: '%', group: 'clinico' },
    { id: 'alimentacao',   label: 'Alimentação atual', type: 'textarea', group: 'nutricao' },
    { id: 'vacinas',       label: 'Vacinas em dia',   type: 'select', options: [['','—'], ['sim','Sim'], ['nao','Não'], ['parcial','Parcial']], group: 'clinico' },
    { id: 'vermifugo',     label: 'Vermífugo (data)', type: 'text', group: 'clinico' },
    { id: 'antiparasita',  label: 'Antiparasitário externo (data)', type: 'text', group: 'clinico' },
    { id: 'creatinina',    label: 'Creatinina', type: 'number', unit: 'mg/dL', group: 'lab' },
    { id: 'potassio',      label: 'Potássio sérico', type: 'number', unit: 'mEq/L', group: 'lab' },
    { id: 'exames',        label: 'Exames relevantes', type: 'textarea', group: 'lab' }
  ]);

  var GROUP_TITLES = {
    identificacao:  'Identificação',
    tutor:          'Tutor',
    antropometria:  'Antropometria',
    sinais_vitais:  'Sinais vitais e exame físico',
    clinico:        'Clínico',
    lab:            'Laboratório',
    nutricao:       'Nutrição e estilo de vida',
    pet:            'Dados do pet'
  };

  /* ------------------------------------------------------------------------
     Catálogo de calculadoras
     Cada item descreve quais campos do cadastro o cálculo consome (inputs
     fixos pelo schema) e quais entradas adicionais o usuário pode informar
     na hora de adicionar o cálculo (extras).
     ------------------------------------------------------------------------ */
  var CALC_CATALOG = {
    medicina: [
      { id: 'imc',          name: 'IMC',                            fn: 'bmi',
        from: ['peso', 'altura'], extras: [],
        format: function(r){ return r.imc.toFixed(1) + ' kg/m² — ' + r.faixa; } },
      { id: 'bsa',          name: 'Superfície corporal (BSA)',      fn: 'bsa',
        from: ['peso', 'altura'], extras: [],
        format: function(r){ return 'Mosteller: ' + r.mosteller.toFixed(2) + ' m² · DuBois: ' + r.dubois.toFixed(2) + ' m²'; } },
      { id: 'peso_ideal',   name: 'Peso ideal (Devine)',            fn: 'idealWeight',
        from: ['altura', 'sexo'], extras: [],
        format: function(r){ return r.pesoIdeal.toFixed(1) + ' kg'; } },
      { id: 'peso_ajust',   name: 'Peso ajustado',                  fn: 'adjustedWeight',
        from: ['peso', 'altura', 'sexo'], extras: [],
        format: function(r){ return r.pesoAjustado.toFixed(1) + ' kg (ideal: ' + r.pesoIdeal.toFixed(1) + ')'; } },
      { id: 'pam',          name: 'Pressão arterial média (PAM)',   fn: 'map',
        from: ['pas', 'pad'], extras: [],
        format: function(r){ return r.map.toFixed(0) + ' mmHg'; } },
      { id: 'choque',       name: 'Índice de choque',               fn: 'shockIndex',
        from: ['fc', 'pas'], extras: [],
        format: function(r){ return r.indice.toFixed(2) + (r.alterado ? ' — alterado (≥0,9)' : ' — normal'); } },
      { id: 'tfg',          name: 'TFG (CKD-EPI 2021)',             fn: 'ckdEpi',
        from: ['creatinina', 'idade', 'sexo'], extras: [],
        format: function(r){ return r.tfg.toFixed(1) + ' mL/min/1,73m² — ' + r.estagio; } },
      { id: 'crcl',         name: 'Clearance de creatinina (Cockcroft-Gault)', fn: 'cockcroftGault',
        from: ['idade', 'peso', 'creatinina', 'sexo'], extras: [],
        format: function(r){ return r.clearance.toFixed(1) + ' mL/min'; } },
      { id: 'fena',         name: 'FeNa',                            fn: 'fena',
        from: [], extras: [
          { id: 'naSerico',   label: 'Sódio sérico',     unit: 'mEq/L' },
          { id: 'naUrinario', label: 'Sódio urinário',   unit: 'mEq/L' },
          { id: 'crSerica',   label: 'Creatinina sérica', unit: 'mg/dL' },
          { id: 'crUrinaria', label: 'Creatinina urinária', unit: 'mg/dL' }
        ],
        bind: { naSerico: 'sodio', naUrinario: 'naUrinario', crSerica: 'creatinina', crUrinaria: 'crUrinaria' },
        format: function(r){ return r.fena.toFixed(2) + '% — ' + r.interpretacao; } },
      { id: 'feureia',      name: 'FeUreia',                         fn: 'feUrea',
        from: [], extras: [
          { id: 'ureiaSerica',   label: 'Ureia sérica',      unit: 'mg/dL' },
          { id: 'ureiaUrinaria', label: 'Ureia urinária',    unit: 'mg/dL' },
          { id: 'crSerica',      label: 'Creatinina sérica', unit: 'mg/dL' },
          { id: 'crUrinaria',    label: 'Creatinina urinária', unit: 'mg/dL' }
        ],
        bind: { ureiaSerica: 'ureia', ureiaUrinaria: 'ureiaUrinaria', crSerica: 'creatinina', crUrinaria: 'crUrinaria' },
        format: function(r){ return r.feurea.toFixed(2) + '% — ' + r.interpretacao; } },
      { id: 'na_corr',      name: 'Sódio corrigido (hiperglicemia)', fn: 'correctedSodium',
        from: ['sodio', 'glicemia'], extras: [],
        format: function(r){ return r.sodioCorrigido.toFixed(1) + ' mEq/L (fator ' + r.fator + ')'; } },
      { id: 'ca_corr',      name: 'Cálcio corrigido (albumina)',     fn: 'correctedCalcium',
        from: ['calcio', 'albumina'], extras: [],
        format: function(r){ return r.calcioCorrigido.toFixed(2) + ' mg/dL'; } },
      { id: 'aniongap',     name: 'Ânion gap',                       fn: 'anionGap',
        from: ['sodio', 'cloro', 'bicarbonato', 'albumina'], extras: [],
        format: function(r){ var s = r.anionGap.toFixed(1) + ' mEq/L'; if (r.corrigido != null) s += ' · corrigido: ' + r.corrigido.toFixed(1); return s; } },
      { id: 'osmol',        name: 'Osmolaridade plasmática',         fn: 'osmolality',
        from: ['sodio', 'glicemia', 'ureia'], extras: [],
        format: function(r){ return r.osmolaridade.toFixed(0) + ' mOsm/kg'; } },
      { id: 'qtc',          name: 'QTc (Bazett/Fridericia)',         fn: 'qtc',
        from: ['fc', 'sexo'], extras: [
          { id: 'qt', label: 'Intervalo QT', unit: 'ms' }
        ],
        format: function(r){ return 'Bazett ' + r.bazett.toFixed(0) + ' ms · Fridericia ' + r.fridericia.toFixed(0) + ' ms' + (r.prolongado ? ' — prolongado' : ''); } },
      { id: 'dose',         name: 'Dose por peso',                   fn: 'doseByWeight',
        from: ['peso'], extras: [
          { id: 'dosePorKg',    label: 'Dose por kg', unit: 'mg/kg' },
          { id: 'concentracao', label: 'Concentração (opcional)', unit: 'mg/mL' },
          { id: 'doseMaxima',   label: 'Dose máxima (opcional)', unit: 'mg' }
        ],
        format: function(r){ var s = r.doseTotal.toFixed(1) + ' mg'; if (r.volume != null) s += ' · ' + r.volume.toFixed(2) + ' mL'; if (r.excedeMax) s += ' — excede a dose máxima!'; return s; } },
      { id: 'gotej',        name: 'Gotejamento / infusão IV',        fn: 'ivDripRate',
        from: [], extras: [
          { id: 'volume',          label: 'Volume',        unit: 'mL' },
          { id: 'tempoHoras',      label: 'Tempo',          unit: 'horas' },
          { id: 'fatorGotejamento',label: 'Fator do equipo', unit: 'gtt/mL' }
        ],
        format: function(r){ return r.mlPorHora.toFixed(1) + ' mL/h · ' + r.gotasPorMin.toFixed(0) + ' gtt/min'; } },
      { id: 'holliday',     name: 'Holliday-Segar (pediatria)',      fn: 'hollidaySegar',
        from: ['peso'], extras: [],
        format: function(r){ return r.mlPorDia.toFixed(0) + ' mL/dia (' + r.mlPorHora.toFixed(0) + ' mL/h)'; } },
      { id: 'parkland',     name: 'Parkland (queimadura)',           fn: 'parkland',
        from: ['peso'], extras: [
          { id: 'scq', label: 'Superfície corporal queimada', unit: '%' }
        ],
        format: function(r){ return r.total24h.toFixed(0) + ' mL em 24 h (½ nas 8 h iniciais: ' + r.primeiras8h.toFixed(0) + ' mL)'; } },
      { id: 'meld',         name: 'MELD-Na',                         fn: 'meldNa',
        from: ['bilirrubina', 'inr', 'creatinina', 'sodio'], extras: [
          { id: 'dialise', label: 'Diálise nas últimas semanas (sim/não)', kind: 'bool' }
        ],
        format: function(r){ return 'MELD ' + r.meld + ' · MELD-Na ' + r.meldNa + ' (mortalidade 90d ' + r.mortalidade90d + ')'; } },
      { id: 'child',        name: 'Child-Pugh',                      fn: 'childPugh',
        from: ['bilirrubina', 'albumina', 'inr'], extras: [
          { id: 'ascite',        label: 'Ascite', kind: 'select', options: [['ausente','Ausente'], ['leve','Leve'], ['moderada','Moderada']] },
          { id: 'encefalopatia', label: 'Encefalopatia', kind: 'select', options: [['ausente','Ausente'], ['leve','Leve'], ['avancada','Avançada']] }
        ],
        format: function(r){ return r.total + ' pontos — ' + r.classe; } }
    ],

    nutricao: [
      { id: 'imc',         name: 'IMC',                              fn: 'bmi',
        from: ['peso','altura'], extras: [],
        format: function(r){ return r.imc.toFixed(1) + ' kg/m² — ' + r.faixa; } },
      { id: 'tmb_mif',     name: 'TMB — Mifflin-St Jeor',            fn: 'bmrMifflin',
        from: ['peso','altura','idade','sexo'], extras: [],
        format: function(r){ return r.tmb.toFixed(0) + ' kcal/dia'; } },
      { id: 'tmb_hb',      name: 'TMB — Harris-Benedict',            fn: 'bmrHarris',
        from: ['peso','altura','idade','sexo'], extras: [],
        format: function(r){ return r.tmb.toFixed(0) + ' kcal/dia'; } },
      { id: 'get',         name: 'Gasto energético total (GET)',     fn: 'tdee',
        from: [], extras: [
          { id: 'tmb',    label: 'TMB',                  unit: 'kcal/dia' },
          { id: 'fator',  label: 'Fator de atividade',   unit: '×' }
        ],
        format: function(r){ return r.get.toFixed(0) + ' kcal/dia'; } },
      { id: 'macros',      name: 'Distribuição de macros',           fn: 'macros',
        from: [], extras: [
          { id: 'calorias',   label: 'Calorias-alvo', unit: 'kcal/dia' },
          { id: 'pctProteina',label: 'Proteína',      unit: '%' },
          { id: 'pctCarbo',   label: 'Carboidrato',   unit: '%' },
          { id: 'pctGordura', label: 'Gordura',       unit: '%' }
        ],
        format: function(r){ return 'P: ' + r.proteinaG.toFixed(0) + ' g · C: ' + r.carboG.toFixed(0) + ' g · G: ' + r.gorduraG.toFixed(0) + ' g'; } },
      { id: 'agua',        name: 'Necessidade hídrica diária',       fn: 'waterNeeds',
        from: ['peso'], extras: [
          { id: 'mlPorKg', label: 'mL por kg (padrão 35)', unit: 'mL/kg' }
        ],
        format: function(r){ return r.mlPorDia.toFixed(0) + ' mL/dia (' + r.litros.toFixed(1) + ' L)'; } },
      { id: 'rcq',         name: 'Relação cintura-quadril',          fn: 'waistHip',
        from: ['cintura','quadril','sexo'], extras: [],
        format: function(r){ return r.rcq.toFixed(2) + (r.riscoElevado ? ' — risco elevado (>' + r.limite + ')' : ' — risco habitual'); } },
      { id: 'gord',        name: '% de gordura corporal',            fn: 'bodyFat',
        from: ['peso','altura','idade','sexo'], extras: [],
        format: function(r){ return r.percentualGordura.toFixed(1) + '% (IMC ' + r.imc.toFixed(1) + ')'; } },
      { id: 'peso_ideal',  name: 'Peso ideal (Devine)',              fn: 'idealWeight',
        from: ['altura','sexo'], extras: [],
        format: function(r){ return r.pesoIdeal.toFixed(1) + ' kg'; } }
    ],

    veterinaria: [
      { id: 'rer',          name: 'RER — energia de repouso',        fn: 'vetRer',
        from: ['peso'], extras: [],
        format: function(r){ return r.rer.toFixed(0) + ' kcal/dia'; } },
      { id: 'mer',          name: 'MER — energia de manutenção',     fn: 'vetMer',
        from: ['peso'], extras: [
          { id: 'fator', label: 'Fator (condição do animal)', unit: '×' }
        ],
        format: function(r){ return r.mer.toFixed(0) + ' kcal/dia (RER ' + r.rer.toFixed(0) + ')'; } },
      { id: 'fluidos',      name: 'Fluidoterapia 24 h',              fn: 'vetFluids',
        from: ['peso', 'desidratacao'], extras: [
          { id: 'mlKgDia', label: 'mL/kg/dia (padrão 50)', unit: 'mL/kg/dia' }
        ],
        format: function(r){ return r.total24h.toFixed(0) + ' mL em 24 h (' + r.mlPorHora.toFixed(1) + ' mL/h)'; } },
      { id: 'k_supl',       name: 'Suplementação de potássio',       fn: 'vetPotassium',
        from: ['potassio', 'peso'], extras: [],
        format: function(r){ if (r.mEqPorLitro === 0) return r.mensagem; var s = r.mEqPorLitro + ' mEq/L'; if (r.taxaMaxMlh != null) s += ' · taxa máx. ' + r.taxaMaxMlh.toFixed(0) + ' mL/h'; return s; } },
      { id: 'dose_pet',     name: 'Dose por peso',                   fn: 'doseByWeight',
        from: ['peso'], extras: [
          { id: 'dosePorKg',    label: 'Dose por kg', unit: 'mg/kg' },
          { id: 'concentracao', label: 'Concentração (opcional)', unit: 'mg/mL' }
        ],
        format: function(r){ var s = r.doseTotal.toFixed(2) + ' mg'; if (r.volume != null) s += ' · ' + r.volume.toFixed(2) + ' mL'; return s; } },
      { id: 'gotej_vet',    name: 'Gotejamento / infusão IV',        fn: 'ivDripRate',
        from: [], extras: [
          { id: 'volume',          label: 'Volume',        unit: 'mL' },
          { id: 'tempoHoras',      label: 'Tempo',          unit: 'horas' },
          { id: 'fatorGotejamento',label: 'Fator do equipo', unit: 'gtt/mL' }
        ],
        format: function(r){ return r.mlPorHora.toFixed(1) + ' mL/h · ' + r.gotasPorMin.toFixed(0) + ' gtt/min'; } },
      { id: 'idade_pet',    name: 'Idade humana equivalente',        fn: 'petAge',
        from: ['idade'], extras: [
          { id: 'especie', label: 'Espécie', kind: 'select', options: [['cao','Cão'],['gato','Gato']] },
          { id: 'porte',   label: 'Porte (cães)', kind: 'select', options: [['pequeno','Pequeno'],['medio','Médio'],['grande','Grande']] }
        ],
        format: function(r){ return r.idadeHumana.toFixed(0) + ' anos humanos'; } }
    ]
  };

  /* ------------------------------------------------------------------------
     Estado: dados do paciente + lista de cálculos adicionados
     ------------------------------------------------------------------------ */
  var state = {
    area: null,
    schema: null,
    catalog: null,
    patient: {},       // valores do cadastro
    calcs: []          // [{ id, name, inputs, result }]
  };

  /* ------------------------------------------------------------------------
     Helpers
     ------------------------------------------------------------------------ */
  function el(tag, attrs, children) {
    var n = document.createElement(tag);
    if (attrs) for (var k in attrs) {
      if (k === 'className') n.className = attrs[k];
      else if (k === 'innerHTML') n.innerHTML = attrs[k];
      else if (k.indexOf('on') === 0) n.addEventListener(k.slice(2), attrs[k]);
      else n.setAttribute(k, attrs[k]);
    }
    if (children) for (var i = 0; i < children.length; i++) {
      var c = children[i];
      if (c == null) continue;
      if (typeof c === 'string') n.appendChild(document.createTextNode(c));
      else n.appendChild(c);
    }
    return n;
  }

  function parseNum(v) {
    if (v == null || v === '') return NaN;
    return parseFloat(String(v).replace(',', '.'));
  }

  function isEmpty(v) {
    return v == null || v === '' || (typeof v === 'number' && !isFinite(v));
  }

  function formatLabel(field) {
    return field.label + (field.unit ? ' (' + field.unit + ')' : '');
  }

  /* ------------------------------------------------------------------------
     Renderização do formulário
     ------------------------------------------------------------------------ */
  function renderForm(container) {
    var groups = {};
    state.schema.forEach(function (f) {
      if (!groups[f.group]) groups[f.group] = [];
      groups[f.group].push(f);
    });

    Object.keys(groups).forEach(function (gid) {
      var fields = groups[gid];
      var fs = el('fieldset', { className: 'field-group' });
      fs.appendChild(el('legend', null, [GROUP_TITLES[gid] || gid]));
      fields.forEach(function (f) {
        fs.appendChild(renderField(f));
      });
      container.appendChild(fs);
    });
  }

  function renderField(f) {
    var input;
    if (f.type === 'textarea') {
      input = el('textarea', { className: 'input', id: 'cad-' + f.id, rows: '3', autocomplete: 'off' });
    } else if (f.type === 'select') {
      input = el('select', { className: 'input', id: 'cad-' + f.id });
      f.options.forEach(function (op) {
        input.appendChild(el('option', { value: op[0] }, [op[1]]));
      });
    } else {
      input = el('input', {
        className: 'input', id: 'cad-' + f.id,
        type: f.type === 'number' ? 'text' : f.type,
        inputmode: f.type === 'number' ? 'decimal' : null,
        autocomplete: 'off'
      });
    }
    input.addEventListener('input', function () {
      state.patient[f.id] = input.value;
    });

    var inner;
    if (f.unit && f.type !== 'textarea' && f.type !== 'select') {
      inner = el('div', { className: 'input-affix' }, [
        input,
        el('span', { className: 'input-affix__unit' }, [f.unit])
      ]);
    } else {
      inner = input;
    }
    var field = el('div', { className: 'field' }, [
      el('label', { 'for': 'cad-' + f.id }, [f.label]),
      inner
    ]);
    return field;
  }

  /* ------------------------------------------------------------------------
     Calculadoras: adicionar / executar / remover
     ------------------------------------------------------------------------ */
  function buildCalcSelector(container) {
    var sel = el('select', { className: 'input', id: 'cad-calc-select' });
    sel.appendChild(el('option', { value: '' }, ['— Escolha um cálculo —']));
    state.catalog.forEach(function (c) {
      sel.appendChild(el('option', { value: c.id }, [c.name]));
    });

    var extrasBox = el('div', { id: 'cad-calc-extras', className: 'card-grid' });

    sel.addEventListener('change', function () {
      extrasBox.innerHTML = '';
      var c = state.catalog.find(function (x) { return x.id === sel.value; });
      if (!c) return;
      c.extras.forEach(function (ex) {
        var node;
        if (ex.kind === 'select') {
          node = el('select', { className: 'input', id: 'cad-extra-' + ex.id });
          node.appendChild(el('option', { value: '' }, ['—']));
          ex.options.forEach(function (op) {
            node.appendChild(el('option', { value: op[0] }, [op[1]]));
          });
        } else if (ex.kind === 'bool') {
          node = el('select', { className: 'input', id: 'cad-extra-' + ex.id });
          node.appendChild(el('option', { value: '' }, ['Não']));
          node.appendChild(el('option', { value: '1' }, ['Sim']));
        } else {
          node = el('input', { className: 'input', id: 'cad-extra-' + ex.id, type: 'text', inputmode: 'decimal', autocomplete: 'off' });
        }
        var inner = ex.unit ? el('div', { className: 'input-affix' }, [node, el('span', { className: 'input-affix__unit' }, [ex.unit])]) : node;
        extrasBox.appendChild(el('div', { className: 'field' }, [
          el('label', { 'for': 'cad-extra-' + ex.id }, [ex.label]),
          inner
        ]));
      });
    });

    var addBtn = el('button', {
      className: 'btn btn--primary', type: 'button',
      onclick: function () {
        var id = sel.value;
        if (!id) return;
        addCalc(id);
        sel.value = '';
        extrasBox.innerHTML = '';
      }
    }, ['+ Adicionar cálculo']);

    container.appendChild(el('div', { className: 'calc-add-row' }, [
      el('div', { className: 'field' }, [
        el('label', { 'for': 'cad-calc-select' }, ['Calculadora']),
        sel
      ]),
      addBtn
    ]));
    container.appendChild(extrasBox);
  }

  function addCalc(id) {
    var c = state.catalog.find(function (x) { return x.id === id; });
    if (!c) return;

    var inputs = {};
    c.from.forEach(function (k) {
      var v = state.patient[k];
      if (v === 'M' || v === 'F' || v === 'cao' || v === 'gato' || v === 'pequeno' || v === 'medio' || v === 'grande') {
        inputs[k] = v;
      } else {
        var n = parseNum(v);
        if (isFinite(n)) inputs[k] = n;
      }
    });
    // bind: mapeia chaves do schema (cadastro) para chaves esperadas pela função
    if (c.bind) {
      Object.keys(c.bind).forEach(function (target) {
        var src = c.bind[target];
        var v = state.patient[src];
        var n = parseNum(v);
        if (isFinite(n)) inputs[target] = n;
      });
    }
    c.extras.forEach(function (ex) {
      var node = document.getElementById('cad-extra-' + ex.id);
      if (!node) return;
      var v = node.value;
      if (ex.kind === 'bool') { if (v === '1') inputs[ex.id] = true; }
      else if (ex.kind === 'select') { if (v) inputs[ex.id] = v; }
      else { var n = parseNum(v); if (isFinite(n)) inputs[ex.id] = n; }
    });

    var fn = Clinical[c.fn];
    var r = fn(inputs);
    state.calcs.push({ id: c.id, name: c.name, inputs: inputs, result: r, format: c.format });
    renderCalcList();
  }

  function renderCalcList() {
    var list = document.getElementById('cad-calc-list');
    list.innerHTML = '';
    if (!state.calcs.length) {
      list.appendChild(el('p', { className: 'calculator__hint' }, ['Nenhum cálculo adicionado ainda. Os cálculos são opcionais — você pode exportar apenas os dados cadastrais.']));
      return;
    }
    state.calcs.forEach(function (cc, idx) {
      var resultText, isError = false;
      if (cc.result && cc.result.error) { resultText = cc.result.error; isError = true; }
      else { try { resultText = cc.format(cc.result); } catch (e) { resultText = 'Não foi possível calcular (dados insuficientes).'; isError = true; } }

      var removeBtn = el('button', {
        className: 'btn btn--ghost btn--icon-only', type: 'button', 'aria-label': 'Remover',
        onclick: function () { state.calcs.splice(idx, 1); renderCalcList(); }
      }, ['Remover']);

      var card = el('div', { className: 'cad-calc-card' }, [
        el('div', { className: 'cad-calc-card__head' }, [
          el('span', { className: 'cad-calc-card__name' }, [cc.name]),
          removeBtn
        ]),
        el('div', { className: 'cad-calc-card__result' + (isError ? ' is-error' : '') }, [resultText])
      ]);
      list.appendChild(card);
    });
  }

  /* ------------------------------------------------------------------------
     Pré-visualização do relatório
     ------------------------------------------------------------------------ */
  function renderReport() {
    var preview = document.getElementById('cad-report');
    preview.innerHTML = '';

    var head = el('div', { className: 'report-preview__head' }, [
      el('svg', { className: 'report-preview__brand', viewBox: '0 0 64 64', innerHTML: '<rect width="64" height="64" rx="14" fill="#0d9488"/><rect x="27" y="14" width="10" height="36" rx="3" fill="#fff"/><rect x="14" y="27" width="36" height="10" rx="3" fill="#fff"/>' }),
      el('div', null, [
        el('div', { className: 'report-preview__title' }, ['Kit Clínico — Relatório do paciente']),
        el('div', { className: 'report-preview__sub' }, [
          'Área: ' + state.area + ' · Gerado em ' + new Date().toLocaleString('pt-BR')
        ])
      ])
    ]);
    preview.appendChild(head);

    var groups = {};
    state.schema.forEach(function (f) {
      var v = state.patient[f.id];
      if (isEmpty(v)) return;
      if (!groups[f.group]) groups[f.group] = [];
      groups[f.group].push({ f: f, v: v });
    });

    Object.keys(groups).forEach(function (gid) {
      var sec = el('section', { className: 'report-section' });
      sec.appendChild(el('h3', null, [GROUP_TITLES[gid] || gid]));
      var dl = el('dl');
      groups[gid].forEach(function (it) {
        var label = it.f.label;
        // Para selects, mostrar o rótulo da opção, não o value
        var displayVal = it.v;
        if (it.f.type === 'select' && it.f.options) {
          var op = it.f.options.find(function (o) { return o[0] === it.v; });
          if (op) displayVal = op[1];
        }
        if (it.f.unit) displayVal = String(displayVal) + ' ' + it.f.unit;
        dl.appendChild(el('dt', null, [label]));
        dl.appendChild(el('dd', null, [displayVal]));
      });
      sec.appendChild(dl);
      preview.appendChild(sec);
    });

    if (state.calcs.length) {
      var calcSec = el('section', { className: 'report-section' });
      calcSec.appendChild(el('h3', null, ['Cálculos clínicos']));
      state.calcs.forEach(function (cc) {
        var resultText;
        try { resultText = (cc.result && cc.result.error) ? cc.result.error : cc.format(cc.result); }
        catch (e) { resultText = 'Não foi possível calcular.'; }
        calcSec.appendChild(el('div', { className: 'report-calc' }, [
          el('div', { className: 'report-calc__name' }, [cc.name]),
          el('div', { className: 'report-calc__result' }, [resultText])
        ]));
      });
      preview.appendChild(calcSec);
    }

    preview.appendChild(el('div', { className: 'report-footer' }, [
      'Relatório gerado pelo ',
      el('a', { href: 'https://kitclinico.com.br/', target: '_blank' }, ['Kit Clínico']),
      ' — kitclinico.com.br · Os dados informados não são armazenados pelo site.'
    ]));

    preview.hidden = false;
    preview.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* ------------------------------------------------------------------------
     Exportação
     ------------------------------------------------------------------------ */
  function patientFileSlug() {
    var raw = state.patient.nome || state.patient.pet_nome || 'paciente';
    return raw.normalize('NFD').replace(/[̀-ͯ]/g, '')
              .replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '').toLowerCase() || 'paciente';
  }
  function isoStamp() {
    var d = new Date(); var p = function (n) { return String(n).padStart(2, '0'); };
    return d.getFullYear() + p(d.getMonth()+1) + p(d.getDate()) + '_' + p(d.getHours()) + p(d.getMinutes());
  }
  function baseFileName() {
    return 'kitclinico_' + state.area + '_' + patientFileSlug() + '_' + isoStamp();
  }

  function buildJSON() {
    var payload = {
      gerado_por: 'Kit Clínico (kitclinico.com.br)',
      gerado_em: new Date().toISOString(),
      area: state.area,
      paciente: {},
      calculos: []
    };
    state.schema.forEach(function (f) {
      var v = state.patient[f.id];
      if (isEmpty(v)) return;
      payload.paciente[f.id] = v;
    });
    state.calcs.forEach(function (cc) {
      var resultText;
      try { resultText = (cc.result && cc.result.error) ? cc.result.error : cc.format(cc.result); }
      catch (e) { resultText = null; }
      payload.calculos.push({
        id: cc.id, nome: cc.name, entradas: cc.inputs,
        resultado_bruto: cc.result, resultado_formatado: resultText
      });
    });
    return payload;
  }

  function downloadBlob(blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    setTimeout(function () { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
  }

  function exportJSON() {
    var payload = buildJSON();
    var blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    downloadBlob(blob, baseFileName() + '.json');
  }

  function exportExcel() {
    if (typeof XLSX === 'undefined') { alert('Biblioteca de planilhas ainda carregando — tente novamente em alguns segundos.'); return; }
    var wb = XLSX.utils.book_new();

    // Aba 1: paciente
    var rows = [['Campo', 'Valor']];
    state.schema.forEach(function (f) {
      var v = state.patient[f.id];
      if (isEmpty(v)) return;
      if (f.type === 'select' && f.options) {
        var op = f.options.find(function (o) { return o[0] === v; });
        if (op) v = op[1];
      }
      rows.push([f.label + (f.unit ? ' (' + f.unit + ')' : ''), v]);
    });
    var ws1 = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws1, 'Paciente');

    // Aba 2: cálculos
    if (state.calcs.length) {
      var crows = [['Cálculo', 'Resultado', 'Entradas']];
      state.calcs.forEach(function (cc) {
        var resultText;
        try { resultText = (cc.result && cc.result.error) ? cc.result.error : cc.format(cc.result); }
        catch (e) { resultText = '—'; }
        crows.push([cc.name, resultText, JSON.stringify(cc.inputs)]);
      });
      var ws2 = XLSX.utils.aoa_to_sheet(crows);
      XLSX.utils.book_append_sheet(wb, ws2, 'Calculos');
    }

    // Aba 3: metadados
    var meta = [
      ['Gerado por', 'Kit Clínico'],
      ['Site', 'https://kitclinico.com.br/'],
      ['Área', state.area],
      ['Gerado em', new Date().toLocaleString('pt-BR')],
      ['Aviso', 'Uso educacional. Não substitui o julgamento clínico profissional. Os dados não são armazenados pelo site.']
    ];
    var ws3 = XLSX.utils.aoa_to_sheet(meta);
    XLSX.utils.book_append_sheet(wb, ws3, 'Kit Clinico');

    XLSX.writeFile(wb, baseFileName() + '.xlsx');
  }

  function exportPDF() {
    if (typeof window.jspdf === 'undefined') { alert('Biblioteca de PDF ainda carregando — tente novamente em alguns segundos.'); return; }
    var jsPDF = window.jspdf.jsPDF;
    var doc = new jsPDF({ unit: 'mm', format: 'a4' });
    var W = doc.internal.pageSize.getWidth(), M = 14;
    var y = M;

    // Cabeçalho com logo (quadrado teal)
    doc.setFillColor(13, 148, 136);
    doc.roundedRect(M, y, 12, 12, 2, 2, 'F');
    doc.setFillColor(255, 255, 255);
    doc.rect(M + 5.2, y + 1.5, 1.6, 9, 'F');
    doc.rect(M + 1.5, y + 5.2, 9, 1.6, 'F');
    doc.setFontSize(16); doc.setTextColor(15, 23, 42); doc.setFont(undefined, 'bold');
    doc.text('Kit Clínico — Relatório do paciente', M + 16, y + 6);
    doc.setFontSize(9); doc.setTextColor(100, 116, 139); doc.setFont(undefined, 'normal');
    doc.text('Área: ' + state.area + ' · Gerado em ' + new Date().toLocaleString('pt-BR'), M + 16, y + 11);
    y += 18;
    doc.setDrawColor(13, 148, 136); doc.setLineWidth(0.6);
    doc.line(M, y, W - M, y); y += 6;

    function checkPage(needed) {
      if (y + needed > 285) { doc.addPage(); y = M; }
    }
    function sectionTitle(t) {
      checkPage(10);
      doc.setFontSize(12); doc.setTextColor(15, 94, 89); doc.setFont(undefined, 'bold');
      doc.text(t, M, y); y += 6;
      doc.setDrawColor(204, 251, 241); doc.setLineWidth(0.3);
      doc.line(M, y - 3, W - M, y - 3);
    }
    function row(label, val) {
      doc.setFont(undefined, 'normal'); doc.setFontSize(10); doc.setTextColor(100, 116, 139);
      var lblLines = doc.splitTextToSize(label + ':', 60);
      doc.text(lblLines, M, y);
      doc.setTextColor(15, 23, 42);
      var vLines = doc.splitTextToSize(String(val), W - M - 70);
      doc.text(vLines, M + 65, y);
      var lh = Math.max(lblLines.length, vLines.length) * 4.5;
      y += lh + 1;
      checkPage(8);
    }

    var groups = {};
    state.schema.forEach(function (f) {
      var v = state.patient[f.id];
      if (isEmpty(v)) return;
      if (!groups[f.group]) groups[f.group] = [];
      groups[f.group].push({ f: f, v: v });
    });

    Object.keys(groups).forEach(function (gid) {
      sectionTitle(GROUP_TITLES[gid] || gid);
      groups[gid].forEach(function (it) {
        var label = it.f.label;
        var val = it.v;
        if (it.f.type === 'select' && it.f.options) {
          var op = it.f.options.find(function (o) { return o[0] === val; });
          if (op) val = op[1];
        }
        if (it.f.unit) val = String(val) + ' ' + it.f.unit;
        row(label, val);
      });
      y += 3;
    });

    if (state.calcs.length) {
      sectionTitle('Cálculos clínicos');
      state.calcs.forEach(function (cc) {
        var resultText;
        try { resultText = (cc.result && cc.result.error) ? cc.result.error : cc.format(cc.result); }
        catch (e) { resultText = '—'; }
        row(cc.name, resultText);
      });
    }

    y += 6; checkPage(20);
    doc.setDrawColor(229, 231, 235); doc.line(M, y, W - M, y); y += 4;
    doc.setFontSize(8); doc.setTextColor(100, 116, 139);
    doc.textWithLink('Relatório gerado pelo Kit Clínico — kitclinico.com.br', M, y, { url: 'https://kitclinico.com.br/' });
    y += 4;
    doc.text('Uso educacional. Não substitui o julgamento clínico. Os dados informados não são armazenados pelo site.', M, y);

    doc.save(baseFileName() + '.pdf');
  }

  /* ------------------------------------------------------------------------
     Inicialização
     ------------------------------------------------------------------------ */
  function init(area) {
    if (!SCHEMAS[area]) throw new Error('Área desconhecida: ' + area);
    state.area = area;
    state.schema = SCHEMAS[area];
    state.catalog = CALC_CATALOG[area];

    renderForm(document.getElementById('cad-form-fields'));
    buildCalcSelector(document.getElementById('cad-calc-builder'));
    renderCalcList();

    document.getElementById('cad-btn-report').addEventListener('click', renderReport);
    document.getElementById('cad-btn-pdf').addEventListener('click', exportPDF);
    document.getElementById('cad-btn-xlsx').addEventListener('click', exportExcel);
    document.getElementById('cad-btn-json').addEventListener('click', exportJSON);
    document.getElementById('cad-btn-clear').addEventListener('click', function () {
      if (!confirm('Limpar todos os dados do cadastro?')) return;
      state.patient = {}; state.calcs = [];
      document.querySelectorAll('#cad-form-fields .input').forEach(function (i) { i.value = ''; });
      renderCalcList();
      document.getElementById('cad-report').hidden = true;
    });
  }

  global.KitCadastro = { init: init };

})(window);
