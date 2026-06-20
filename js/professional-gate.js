/* Kit Clínico — Professional gate + disclaimer
 * Mostra modal na primeira visita pedindo confirmação de que o usuário é
 * profissional de saúde (medicina), médico-veterinário (vet) ou da área
 * (nutricao). Sem confirmar, inputs ficam disabled. Decisão fica em
 * localStorage por 365 dias, com chave SEPARADA por área — aceitar em
 * medicina não libera veterinária nem nutrição.
 *
 * Activate by setting data-kit-gate="medicina" or "veterinaria" or "nutricao"
 * on <body>. The script reads that attribute and tailors the modal text.
 *
 * Acessibilidade: o modal é um diálogo (role="dialog" aria-modal="true"),
 * com foco preso dentro (Tab/Shift+Tab ciclam apenas pelos elementos
 * focáveis do modal) e restauração do foco ao elemento que disparou a
 * abertura quando o modal é fechado.
 */
(function () {
  'use strict';
  var KEY_PREFIX = 'kc-gate-';
  var LEGACY_KEY = 'kc-gate-v1';
  var TTL_DAYS = 365;

  function keyFor(area) {
    // medicina/veterinaria/nutricao → kc-gate-medicina, etc.
    return KEY_PREFIX + area;
  }

  function readGate(area) {
    try {
      var raw = localStorage.getItem(keyFor(area));
      if (!raw) {
        // Compatibilidade: se houver registro antigo global E for da mesma
        // área, aproveita; caso contrário ignora (forçar novo aceite por área).
        var legacy = localStorage.getItem(LEGACY_KEY);
        if (legacy) {
          try {
            var ldata = JSON.parse(legacy);
            if (ldata && ldata.profile === area) {
              var lage = (Date.now() - ldata.ts) / 86400000;
              if (lage <= TTL_DAYS) return ldata;
            }
          } catch (e) { /* ignora */ }
        }
        return null;
      }
      var data = JSON.parse(raw);
      var ageDays = (Date.now() - data.ts) / 86400000;
      if (ageDays > TTL_DAYS) return null;
      return data;
    } catch (e) { return null; }
  }
  function writeGate(area) {
    try {
      localStorage.setItem(keyFor(area), JSON.stringify({
        profile: area,
        ts: Date.now(),
        v: 2
      }));
    } catch (e) { /* nada */ }
  }

  function disableInputs() {
    var els = document.querySelectorAll('input, select, textarea, button[type="submit"], .calculator button');
    els.forEach(function (el) {
      if (el.closest('.kc-gate')) return; // dont disable modal buttons
      el.setAttribute('disabled', 'disabled');
      el.setAttribute('data-kc-gate-blocked', '1');
    });
  }
  function enableInputs() {
    var els = document.querySelectorAll('[data-kc-gate-blocked]');
    els.forEach(function (el) {
      el.removeAttribute('disabled');
      el.removeAttribute('data-kc-gate-blocked');
    });
  }

  function profileLabel(target) {
    return target === 'veterinaria' ? 'médico-veterinário' :
           target === 'medicina'    ? 'profissional de saúde' :
                                      'profissional da área';
  }

  function buildModal(target) {
    var profession = profileLabel(target);
    var label = target === 'veterinaria' ? 'Sou médico-veterinário com registro ativo (CRMV)' :
                target === 'medicina' ? 'Sou profissional de saúde com registro ativo (CRM, COREN, CRF, CRN ou equivalente)' :
                target === 'nutricao' ? 'Sou nutricionista (CRN) ou profissional de saúde com registro ativo' :
                'Confirmo que entendo o caráter educacional da ferramenta';

    var html = ''
      + '<div class="kc-gate" role="dialog" aria-modal="true" aria-labelledby="kc-gate-title" aria-describedby="kc-gate-desc">'
      + '  <div class="kc-gate__backdrop"></div>'
      + '  <div class="kc-gate__panel">'
      + '    <h2 id="kc-gate-title" class="kc-gate__title">Antes de continuar</h2>'
      + '    <p id="kc-gate-desc" class="kc-gate__lead">As ferramentas do <strong>Kit Clínico</strong> são <strong>educacionais</strong> e reproduzem fórmulas e escores publicados na literatura científica. Elas <strong>não substituem</strong> avaliação clínica, exame físico, julgamento profissional ou diretrizes institucionais.</p>'
      + '    <p class="kc-gate__lead">Os resultados são estimativas estatísticas baseadas em populações e podem não refletir o caso individual. <strong>Decisões clínicas são responsabilidade do ' + profession + ' assistente</strong>, em conformidade com a Lei 12.842/2013 (Ato Médico) e regulamentação dos conselhos profissionais. O aceite vale apenas para esta área (' + target + ').</p>'
      + '    <label class="kc-gate__check">'
      + '      <input type="checkbox" id="kc-gate-pro"> ' + label
      + '    </label>'
      + '    <label class="kc-gate__check">'
      + '      <input type="checkbox" id="kc-gate-terms"> Li e aceito os <a href="/termos.html" target="_blank" rel="noopener">Termos de Uso</a> e a <a href="/privacidade.html" target="_blank" rel="noopener">Política de Privacidade</a>'
      + '    </label>'
      + '    <div class="kc-gate__actions">'
      + '      <button type="button" class="btn btn--ghost" id="kc-gate-leave">Voltar ao início</button>'
      + '      <button type="button" class="btn btn--primary" id="kc-gate-confirm" disabled>Entendo, continuar</button>'
      + '    </div>'
      + '  </div>'
      + '</div>';
    var wrap = document.createElement('div');
    wrap.innerHTML = html;
    return wrap.firstElementChild;
  }

  /* -----------------------------------------------------------------------
   * Focus trap helpers
   * --------------------------------------------------------------------- */
  var FOCUSABLE = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled]):not([type="hidden"])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])'
  ].join(',');

  function focusables(root) {
    return Array.prototype.filter.call(
      root.querySelectorAll(FOCUSABLE),
      function (el) {
        return el.offsetWidth > 0 || el.offsetHeight > 0 || el === document.activeElement;
      }
    );
  }

  function trapFocus(modal, e) {
    if (e.key !== 'Tab') return;
    var nodes = focusables(modal);
    if (!nodes.length) { e.preventDefault(); return; }
    var first = nodes[0];
    var last = nodes[nodes.length - 1];
    var active = document.activeElement;
    if (e.shiftKey) {
      if (active === first || !modal.contains(active)) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (active === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  function wireModal(modal, target) {
    var pro = modal.querySelector('#kc-gate-pro');
    var terms = modal.querySelector('#kc-gate-terms');
    var confirm = modal.querySelector('#kc-gate-confirm');
    var leave = modal.querySelector('#kc-gate-leave');

    var previouslyFocused = document.activeElement;

    function updateState() {
      confirm.disabled = !(pro.checked && terms.checked);
    }
    pro.addEventListener('change', updateState);
    terms.addEventListener('change', updateState);

    function closeModal(restoreFocus) {
      document.removeEventListener('keydown', onKey, true);
      modal.remove();
      document.body.classList.remove('kc-gate-open');
      if (restoreFocus && previouslyFocused && typeof previouslyFocused.focus === 'function') {
        try { previouslyFocused.focus(); } catch (e) { /* ignora */ }
      }
    }

    confirm.addEventListener('click', function () {
      writeGate(target);
      enableInputs();
      closeModal(true);
    });
    leave.addEventListener('click', function () {
      window.location.href = '/';
    });

    function onKey(e) {
      if (!document.body.contains(modal)) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        leave.click();
        return;
      }
      trapFocus(modal, e);
    }
    document.addEventListener('keydown', onKey, true);

    // Foco inicial: primeiro botão focável dentro do modal.
    // Damos um tick para o navegador renderizar o modal antes de focar.
    setTimeout(function () {
      var nodes = focusables(modal);
      if (nodes.length) nodes[0].focus();
    }, 0);
  }

  function injectDisclaimer() {
    if (document.querySelector('.kc-disclaimer')) return;
    // Só injeta o disclaimer "in-page" se houver de fato uma calculadora.
    // Em páginas de listagem (medicina.html, veterinaria.html, nutricao.html)
    // o aviso já está em .disclaimer ou no rodapé, não precisa duplicar.
    var calc = document.querySelector('.calculator');
    if (!calc) return;
    var box = document.createElement('div');
    box.className = 'kc-disclaimer';
    box.setAttribute('role', 'note');
    box.innerHTML = '<strong>Aviso:</strong> Este cálculo é <strong>educacional</strong> e reproduz fórmulas/escores publicados na literatura. Não constitui prescrição, diagnóstico ou recomendação clínica. <a href="/termos.html">Termos completos</a>.';
    calc.parentNode.insertBefore(box, calc);
  }

  function init() {
    var target = document.body.getAttribute('data-kit-gate');
    if (!target) return; // pagina nao tem gate

    injectDisclaimer();

    var gate = readGate(target);
    if (gate && gate.profile) return; // ja confirmou esta area

    var modal = buildModal(target);
    document.body.appendChild(modal);
    document.body.classList.add('kc-gate-open');
    disableInputs();
    wireModal(modal, target);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
