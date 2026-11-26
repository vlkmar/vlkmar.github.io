(() => {
  'use strict';
  window.__vmOK = true;

  const html = document.documentElement;
  const klid = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  $$('a[data-todo]').forEach((a) => a.addEventListener('click', (e) => e.preventDefault()));

  const formular = $('[data-formular]');
  const potvrzeni = $('[data-potvrzeni]');
  function nastavStav(odeslano, zameritPotvrzeni) {
    html.dataset.stav = odeslano ? 'odeslano' : 'formular';
    if (odeslano && zameritPotvrzeni && potvrzeni) potvrzeni.focus({ preventScroll: true });
  }

  const rada = $('[data-rada]');
  const pole = $('#email');
  const chyba = $('[data-chyba]');
  const TVAR = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)*\.[^\s@.]{2,}$/;
  const zpravy = { prazdne: 'Nejdřív napište svůj e-mail', spatne: 'V e-mailu něco chybí' };
  const vada = (hodnota) => (!hodnota ? 'prazdne' : TVAR.test(hodnota) ? '' : 'spatne');
  function ukazChybu(druh) {
    if (!rada || !pole || !chyba) return;
    if (druh) {
      rada.setAttribute('data-chyba-stav', druh);
      pole.setAttribute('aria-invalid', 'true');
      if (chyba.textContent !== zpravy[druh]) chyba.textContent = zpravy[druh];
    } else {
      rada.removeAttribute('data-chyba-stav');
      pole.removeAttribute('aria-invalid');
      chyba.textContent = '';
    }
  }
  const ADRESA_ODESLANI = "https://hook.eu2.make.com/6aw6xmsct7aux0skpa2f4n4uf69pq7g2";
  const nezdar = $('[data-nezdar]');
  const znovu = $('[data-znovu]');
  const odeslatTlacitko = formular ? $('button[type="submit"]', formular) : null;
  const past = formular ? $('input[name="web"]', formular) : null;
  let odesila = false;
  function zdrojNavstevy() {
    const p = new URLSearchParams(location.search);
    let z = (p.get('z') || '').trim();
    if (!z) {
      const utm = [];
      p.forEach((hodnota, klic) => {
        const h = hodnota.trim();
        if (/^utm_/i.test(klic) && h) utm.push(`${klic.toLowerCase()}=${h}`);
      });
      z = utm.join('&');
    }
    return z.slice(0, 120);
  }
  function ukazNezdar() {
    html.dataset.stav = 'nezdar';
    if (nezdar) nezdar.focus({ preventScroll: true });
  }
  if (znovu) znovu.addEventListener('click', () => {
    nastavStav(false, false);
    if (pole) pole.focus({ preventScroll: true });
  });
  async function odeslatPrihlaseni(email) {
    if (odesila) return;
    odesila = true;
    if (odeslatTlacitko) odeslatTlacitko.disabled = true;
    formular.setAttribute('aria-busy', 'true');
    let povedlo = false;
    if (ADRESA_ODESLANI) {
      const data = new URLSearchParams();
      data.set('typ', 'newsletter');
      data.set('email', email.trim().toLowerCase());
      const zdroj = zdrojNavstevy();
      if (zdroj) data.set('zdroj', zdroj);
      data.set('stranka', location.pathname);
      if (past && past.value) data.set('web', past.value);
      const preruseni = typeof AbortController === 'function' ? new AbortController() : null;
      const casovac = preruseni ? setTimeout(() => preruseni.abort(), 20000) : 0;
      try {
        const odpoved = await fetch(ADRESA_ODESLANI, {
          method: 'POST',
          body: data,
          credentials: 'omit',
          cache: 'no-store',
          signal: preruseni ? preruseni.signal : undefined,
        });
        const text = await odpoved.text();
        let telo = null;
        try { telo = JSON.parse(text); } catch (e) { telo = null; }
        povedlo = odpoved.ok && !!telo && telo.ok === true;
      } catch (e) {
        povedlo = false;
      } finally {
        clearTimeout(casovac);
      }
    }
    odesila = false;
    if (odeslatTlacitko) odeslatTlacitko.disabled = false;
    formular.removeAttribute('aria-busy');
    if (povedlo) nastavStav(true, true);
    else ukazNezdar();
  }

  if (formular && pole) {
    formular.noValidate = true;
    formular.addEventListener('submit', (e) => {
      e.preventDefault();
      const v = vada(pole.value.trim());
      if (v) { ukazChybu(v); pole.focus({ preventScroll: true }); return; }
      ukazChybu('');
      odeslatPrihlaseni(pole.value.trim());
    });
    pole.addEventListener('blur', () => {
      const h = pole.value.trim();
      ukazChybu(h ? vada(h) : '');
    });
    pole.addEventListener('input', () => {
      const druh = rada.getAttribute('data-chyba-stav');
      if (!druh) return;
      const h = pole.value.trim();
      if (druh === 'prazdne' || !h || !vada(h)) ukazChybu('');
    });
  }

  let spusteno = false;
  function spust() {
    if (spusteno) return;
    spusteno = true;
    if (klid) {
      html.classList.remove('js');
      return;
    }
    requestAnimationFrame(() => requestAnimationFrame(() => {
      $$('[data-radky]').forEach((el) => {
        el.classList.add('je-odkryto');
        const pocet = $$('.maska', el).length;
        setTimeout(() => $$('.maska', el).forEach((m) => m.classList.add('je-hotovo')), (1.075 + pocet * 0.03) * 1000 + 120);
      });
      $$('.nastup').forEach((el) => el.classList.add('je-odkryto'));
    }));
  }
  const pisma = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  Promise.race([pisma, new Promise((r) => setTimeout(r, 1800))]).then(spust);
})();
