/* Kit Clínico — Professional gate + disclaimer
 * Mostra modal na primeira visita pedindo confirmação de que o usuário é
 * profissional de saúde (medicina) ou veterinário (vet). Sem confirmar,
 * inputs ficam disabled. Decisão fica em localStorage por 365 dias.
 *
 * Activate by setting data-kit-gate="medicina" or "veterinaria" or "nutricao"
 * on <body>. The script reads that attribute and tailors the modal text.
 */
(function () {
  'use strict';
  var KEY = 'kc-gate-v1';
  var TTL_DAYS = 365;

  function readGate() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return null;
      var data = JSON.parse(raw);
      var ageDays = (Date.now() - data.ts) / 86400000;
      if (ageDays > TTL_DAYS) return null;
      return data;
    } catch (e) { return null; }
  }
  function writeGate(profile) {
    try {
      localStorage.setItem(KEY, JSON.stringify({
        profile: profile,
        ts: Date.now(),
        v: 1
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

  function buildModal(target) {
    var profession = target === 'veterinaria' ? 'médico-veterinário' :
                     target === 'medicina' ? 'profissional de saúde' :
                     'profissional da área';
    var label = target === 'veterinaria' ? 'Sou médico-veterinário com registro ativo (CRMV)' :
                target === 'medicina' ? 'Sou profissional de saúde com registro ativo (CRM, COREN, CRF, CRN ou equivalente)' :
                'Confirmo que entendo o caráter educacional da ferramenta';

    var html = ''
      + '<div class="kc-gate" role="dialog" aria-modal="true" aria-labelledby="kc-gate-title">'
      + '  <div class="kc-gate__backdrop"></div>'
      + '  <div class="kc-gate__panel">'
      + '    <h2 id="kc-gate-title" class="kc-gate__title">Antes de usar esta calculadora</h2>'
      + '    <p class="kc-gate__lead">As ferramentas do <strong>Kit Clínico</strong> são <strong>educacionais</strong> e reproduzem fórmulas e escores publicados na literatura científica. Elas <strong>não substituem</strong> avaliação clínica, exame físico, julgamento profissional ou diretrizes institucionais.</p>'
      + '    <p class="kc-gate__lead">Os resultados são estimativas estatísticas baseadas em populações e podem não refletir o caso individual. <strong>Conduta clínica é responsabilidade do ' + profession + ' assistente</strong>, em conformidade com a Lei 12.842/2013 (Ato Médico) e regulamentação dos conselhos profissionais.</p>'
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

  function wireModal(modal, target) {
    var pro = modal.querySelector('#kc-gate-pro');
    var terms = modal.querySelector('#kc-gate-terms');
    var confirm = modal.querySelector('#kc-gate-confirm');
    var leave = modal.querySelector('#kc-gate-leave');

    function updateState() {
      confirm.disabled = !(pro.checked && terms.checked);
    }
    pro.addEventListener('change', updateState);
    terms.addEventListener('change', updateState);

    confirm.addEventListener('click', function () {
      writeGate(target);
      modal.remove();
      document.body.classList.remove('kc-gate-open');
      enableInputs();
    });
    leave.addEventListener('click', function () {
      window.location.href = '/';
    });

    document.addEventListener('keydown', function onKey(e) {
      if (e.key === 'Escape' && document.body.contains(modal)) {
        leave.click();
      }
    });
  }

  function injectDisclaimer() {
    if (document.querySelector('.kc-disclaimer')) return;
    var calc = document.querySelector('.calculator, main');
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

    var gate = readGate();
    if (gate && gate.profile) return; // ja confirmou

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
