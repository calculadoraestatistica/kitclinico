/* ==========================================================================
   pediatria.js — Prescricao pediatrica baseada em peso/idade.
   Doses extraidas de protocolos publicados (AAP, IDSA, GINA, SBP, BNFc...).
   Cada esquema apresenta a fonte citada. Calculo 100% no navegador.
   ========================================================================== */
(function (global) {
  'use strict';

  var state = {
    base: null,         // JSON carregado
    peso: null,         // kg
    idadeMeses: null,   // idade em meses (de anos+meses)
    selecionado: null   // condicao selecionada
  };

  function num(x) { return typeof x === 'number' && isFinite(x); }
  function fmtNum(n, dec) {
    if (!num(n)) return '—';
    if (dec === undefined) dec = 1;
    return n.toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
  }
  function normalize(s) {
    return String(s || '').toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/).filter(function (t) { return t && t.length > 1; });
  }

  /* ------------------------------------------------------------------------
     Carga da base
     ------------------------------------------------------------------------ */
  function load() {
    return fetch('/data/pediatria.json').then(function (r) { return r.json(); })
      .then(function (j) { state.base = j; return j; });
  }

  /* ------------------------------------------------------------------------
     Busca: case-insensitive, sem acento, por condicao OU medicamento
     ------------------------------------------------------------------------ */
  function search(query) {
    if (!state.base) return [];
    var q = normalize(query);
    if (!q.length) return state.base.condicoes;
    var scored = state.base.condicoes.map(function (c) {
      var bag = [].concat(
        normalize(c.nome),
        (c.sinonimos || []).flatMap ? c.sinonimos.flatMap(normalize) : [].concat.apply([], (c.sinonimos || []).map(normalize)),
        normalize(c.categoria || ''),
        [].concat.apply([], (c.esquemas || []).map(function (e) { return normalize(e.medicamento || ''); }))
      );
      var hits = 0;
      for (var i = 0; i < q.length; i++) {
        for (var j = 0; j < bag.length; j++) {
          if (bag[j].indexOf(q[i]) === 0) { hits += 2; break; }       // prefix match
          if (bag[j].indexOf(q[i]) > -1) { hits += 1; break; }         // substring
        }
      }
      return { c: c, score: hits };
    }).filter(function (x) { return x.score > 0; });
    scored.sort(function (a, b) { return b.score - a.score; });
    return scored.map(function (x) { return x.c; });
  }

  /* ------------------------------------------------------------------------
     Calculo de dose por esquema
     ------------------------------------------------------------------------ */
  function computeDose(esquema, peso) {
    if (!num(peso) || peso <= 0) return { erro: 'Peso invalido.' };
    var out = { tipo: null };

    // 1) dose por kg por dia, com fracionamento
    if (num(esquema.dose_mg_kg_dia)) {
      var totalDia = peso * esquema.dose_mg_kg_dia;
      if (num(esquema.dose_max_dia_mg) && totalDia > esquema.dose_max_dia_mg) {
        totalDia = esquema.dose_max_dia_mg;
        out.aviso_max = 'Dose limitada à dose máxima diária (' + esquema.dose_max_dia_mg + ' mg).';
      }
      var freq = esquema.frequencia_doses_dia || 1;
      out.tipo = 'fracionada';
      out.dose_dia_mg = totalDia;
      out.dose_por_admin_mg = totalDia / freq;
      out.intervalo_horas = Math.round(24 / freq);
      out.frequencia = freq;
    }
    // 2) dose por kg por dose (com intervalo)
    else if (num(esquema.dose_mg_kg_dose)) {
      var dose = peso * esquema.dose_mg_kg_dose;
      if (num(esquema.dose_max_dose_mg) && dose > esquema.dose_max_dose_mg) {
        dose = esquema.dose_max_dose_mg;
        out.aviso_max = 'Dose limitada à dose máxima por administração (' + esquema.dose_max_dose_mg + ' mg).';
      }
      out.tipo = 'por_dose';
      out.dose_por_admin_mg = dose;
      out.intervalo_horas = esquema.intervalo_horas;
      if (num(esquema.dose_max_dia_mg)) out.dose_max_dia_mg = esquema.dose_max_dia_mg;
    }
    // 3) dose unica em UI/kg (ex.: penicilina benzatina)
    else if (num(esquema.dose_unica_ui_por_kg)) {
      var ui = peso * esquema.dose_unica_ui_por_kg;
      if (num(esquema.dose_max_ui) && ui > esquema.dose_max_ui) {
        ui = esquema.dose_max_ui;
        out.aviso_max = 'Dose limitada à dose máxima (' + esquema.dose_max_ui.toLocaleString('pt-BR') + ' UI).';
      }
      out.tipo = 'dose_unica_ui';
      out.dose_unica_ui = ui;
    }
    // 4) sem calculo numérico — só descrição
    else if (esquema.dose_descricao) {
      out.tipo = 'descritiva';
      out.descricao = esquema.dose_descricao;
    } else {
      return { erro: 'Esquema sem dose calculável.' };
    }

    // Volume por apresentacao
    if ((out.tipo === 'fracionada' || out.tipo === 'por_dose') && esquema.apresentacoes) {
      out.apresentacoes_calc = esquema.apresentacoes.map(function (a) {
        var v = null;
        if (num(a.concentracao_mg_ml)) v = out.dose_por_admin_mg / a.concentracao_mg_ml;
        return { nome: a.nome, obs: a.obs, volume_ml: v, concentracao_mg_ml: a.concentracao_mg_ml };
      });
    } else if (out.tipo === 'dose_unica_ui' && esquema.apresentacoes) {
      out.apresentacoes_calc = esquema.apresentacoes.map(function (a) {
        return { nome: a.nome, obs: a.obs };
      });
    }
    return out;
  }

  /* ------------------------------------------------------------------------
     Validacao etaria
     ------------------------------------------------------------------------ */
  function checkAge(condicao, idadeMeses) {
    if (!num(idadeMeses) || !condicao) return null;
    if (num(condicao.idade_min_meses) && idadeMeses < condicao.idade_min_meses) {
      return 'Esta condição/esquema é recomendado a partir de ' +
             (condicao.idade_min_meses < 12
                ? condicao.idade_min_meses + ' meses'
                : Math.round(condicao.idade_min_meses / 12) + ' anos') +
             '. Avalie cuidadosamente em idade inferior.';
    }
    if (num(condicao.idade_max_meses) && idadeMeses > condicao.idade_max_meses) {
      return 'Esta condição/esquema é validado até ' +
             Math.round(condicao.idade_max_meses / 12) + ' anos.';
    }
    return null;
  }

  /* ------------------------------------------------------------------------
     Formatador de prescricao (texto plano para colar no prontuario)
     ------------------------------------------------------------------------ */
  function formatPrescription(esquema, calc, peso) {
    var L = [];
    L.push(esquema.medicamento.toUpperCase());
    if (calc.tipo === 'fracionada') {
      L.push('Dose: ' + fmtNum(calc.dose_por_admin_mg, 1) + ' mg, a cada ' + calc.intervalo_horas + ' horas');
      L.push('Dose total diária: ' + fmtNum(calc.dose_dia_mg, 1) + ' mg (' + esquema.dose_mg_kg_dia + ' mg/kg/dia para ' + peso + ' kg)');
    } else if (calc.tipo === 'por_dose') {
      L.push('Dose: ' + fmtNum(calc.dose_por_admin_mg, 2) + ' mg, a cada ' + calc.intervalo_horas + ' horas, se necessário');
    } else if (calc.tipo === 'dose_unica_ui') {
      L.push('Dose: ' + calc.dose_unica_ui.toLocaleString('pt-BR') + ' UI em dose única');
    } else if (calc.tipo === 'descritiva') {
      L.push(calc.descricao);
    }
    if (esquema.via) L.push('Via: ' + esquema.via);
    if (esquema.duracao) L.push('Duração: ' + esquema.duracao);
    if (calc.apresentacoes_calc && calc.apresentacoes_calc.length) {
      L.push('');
      L.push('Apresentações possíveis:');
      calc.apresentacoes_calc.forEach(function (a) {
        var line = '- ' + a.nome;
        if (num(a.volume_ml)) line += ' → ' + fmtNum(a.volume_ml, 2) + ' mL por dose';
        if (a.obs) line += ' (' + a.obs + ')';
        L.push(line);
      });
    }
    if (esquema.observacoes) {
      L.push('');
      L.push('Observações: ' + esquema.observacoes);
    }
    if (calc.aviso_max) {
      L.push('');
      L.push('⚠ ' + calc.aviso_max);
    }
    var fonte = state.base.fontes[esquema.fonte_id];
    if (fonte) {
      L.push('');
      L.push('Fonte: ' + fonte.titulo +
             (fonte.publicacao ? ' — ' + fonte.publicacao : '') +
             (fonte.organizacao ? ' (' + fonte.organizacao + ')' : ''));
      if (fonte.url) L.push(fonte.url);
    }
    return L.join('\n');
  }

  /* ------------------------------------------------------------------------
     API publica
     ------------------------------------------------------------------------ */
  global.KitPediatria = {
    load: load,
    search: search,
    computeDose: computeDose,
    checkAge: checkAge,
    formatPrescription: formatPrescription,
    state: state,
    fmtNum: fmtNum
  };

})(window);
