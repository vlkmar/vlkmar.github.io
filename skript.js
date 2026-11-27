(() => {
  'use strict';
  window.__vmOK = true;

  const html = document.documentElement;
  const klid = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mqSiroky = matchMedia('(min-width: 768px)');
  const jemnyUkazatel = matchMedia('(hover: hover) and (pointer: fine)').matches;

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const omez = (v, a, b) => Math.min(b, Math.max(a, v));
  const dvojciferne = (n) => String(n).padStart(2, '0');

  const krivka = (() => {
    const x1 = 0.22, y1 = 1, x2 = 0.298, y2 = 0.955;
    const bx = (t) => 3 * x1 * t * (1 - t) ** 2 + 3 * x2 * t * t * (1 - t) + t ** 3;
    const by = (t) => 3 * y1 * t * (1 - t) ** 2 + 3 * y2 * t * t * (1 - t) + t ** 3;
    return (x) => {
      let lo = 0, hi = 1, t = x;
      for (let i = 0; i < 24; i++) { t = (lo + hi) / 2; if (bx(t) < x) lo = t; else hi = t; }
      return by(t);
    };
  })();

  $$('a[data-todo]').forEach((a) => a.addEventListener('click', (e) => e.preventDefault()));

  let lenis = null;
  if (!klid && window.Lenis) {
    lenis = new window.Lenis({ lerp: 0.165, smoothWheel: true });
  }

  $$('a[href^="#"]').forEach((a) => {
    const id = a.getAttribute('href');
    if (id.length < 2) return;
    a.addEventListener('click', (e) => {
      const cil = document.querySelector(id);
      if (!cil) return;
      e.preventDefault();
      if (lenis) lenis.scrollTo(cil, { duration: 1.25, easing: krivka });
      else cil.scrollIntoView({ behavior: klid ? 'auto' : 'smooth' });
      if (!cil.hasAttribute('tabindex')) cil.setAttribute('tabindex', '-1');
      cil.focus({ preventScroll: true });
    });
  });

  const ATOMY = ['cip', 'hero-stitky', 'tlacitko'];
  const puvodniHtml = new WeakMap();

  function tokeny(uzel, tridy, out) {
    for (const n of Array.from(uzel.childNodes)) {
      if (n.nodeType === 3) {
        for (const kus of n.textContent.split(/([ \t\n\r]+)/)) {
          if (!kus) continue;
          if (/^[ \t\n\r]+$/.test(kus)) out.push({ typ: 'mezera' });
          else out.push({ typ: 'slovo', text: kus, tridy });
        }
      } else if (n.nodeType === 1) {
        if (ATOMY.some((c) => n.classList.contains(c))) out.push({ typ: 'atom', el: n });
        else if (n.tagName === 'BR') out.push({ typ: 'zlom' });
        else if (n.classList.contains('r')) {
          const blok = getComputedStyle(n).display === 'block';
          if (blok) out.push({ typ: 'zlom' });
          tokeny(n, tridy, out);
          if (blok) out.push({ typ: 'zlom' });
        } else tokeny(n, tridy.concat(Array.from(n.classList)), out);
      }
    }
    return out;
  }

  function rozdel(el) {
    if (!puvodniHtml.has(el)) puvodniHtml.set(el, el.innerHTML);
    const seznam = tokeny(el, [], []);

    const kusy = [];
    let mezeraPred = false, zlomPred = false;
    el.textContent = '';
    for (const t of seznam) {
      if (t.typ === 'mezera') { mezeraPred = true; continue; }
      if (t.typ === 'zlom') { zlomPred = true; mezeraPred = false; el.appendChild(document.createElement('br')); continue; }
      let uzel;
      if (t.typ === 'slovo') {
        uzel = document.createElement('span');
        uzel.textContent = t.text;
        if (t.tridy.length) uzel.className = t.tridy.join(' ');
      } else uzel = t.el;
      if (mezeraPred && !zlomPred && kusy.length) el.appendChild(document.createTextNode(' '));
      el.appendChild(uzel);
      kusy.push({ uzel, mezera: mezeraPred && !zlomPred, zlom: zlomPred });
      mezeraPred = false; zlomPred = false;
    }

    const velikost = parseFloat(getComputedStyle(el).fontSize) || 16;
    const radky = [];
    let aktualni = null, stredRadku = 0;
    for (const k of kusy) {
      const r = k.uzel.getBoundingClientRect();
      const stred = r.top + r.height / 2;
      if (!aktualni || k.zlom || Math.abs(stred - stredRadku) > velikost * 0.45) {
        aktualni = [];
        radky.push(aktualni);
        stredRadku = stred;
        k.mezera = false;
      }
      aktualni.push(k);
    }

    el.textContent = '';
    radky.forEach((radek, i) => {
      const maska = document.createElement('span');
      maska.className = 'maska';
      const vnitrek = document.createElement('span');
      vnitrek.className = 'radek';
      vnitrek.style.setProperty('--r', i);
      radek.forEach((k, j) => {
        if (j > 0 && k.mezera) vnitrek.appendChild(document.createTextNode(' '));
        vnitrek.appendChild(k.uzel);
      });
      maska.appendChild(vnitrek);
      el.appendChild(maska);
    });
    el.classList.add('je-rozdeleno');
  }

  function odkryj(el) {
    if (el.classList.contains('je-odkryto')) return;
    el.classList.add('je-odkryto');
    const pocet = $$('.maska', el).length;
    clearTimeout(el._hotovo);
    el._hotovo = setTimeout(() => {
      $$('.maska', el).forEach((m) => m.classList.add('je-hotovo'));
    }, (1.075 + pocet * 0.03) * 1000 + 120);
  }
  function skryj(el) {
    clearTimeout(el._hotovo);
    el.classList.remove('je-odkryto');
    $$('.maska', el).forEach((m) => m.classList.remove('je-hotovo'));
  }

  function pripravOdometr(el) {
    const text = el.textContent;
    el.setAttribute('aria-label', text.replace(/ /g, ' '));
    el.textContent = '';
    const obal = document.createElement('span');
    obal.className = 'odo';
    obal.setAttribute('aria-hidden', 'true');
    let poradi = 0;
    for (const znak of text) {
      if (/\d/.test(znak)) {
        const sloupec = document.createElement('span');
        sloupec.className = 'odo-sloupec';
        const meritko = document.createElement('span');
        meritko.className = 'odo-meritko';
        meritko.textContent = znak;
        const pas = document.createElement('span');
        pas.className = 'odo-pas';
        pas.style.setProperty('--d', poradi++);
        for (let i = 0; i < 20; i++) {
          const c = document.createElement('span');
          c.textContent = i % 10;
          pas.appendChild(c);
        }
        pas.dataset.cil = znak;
        sloupec.append(meritko, pas);
        obal.appendChild(sloupec);
      } else {
        const s = document.createElement('span');
        s.textContent = znak;
        obal.appendChild(s);
      }
    }
    el.appendChild(obal);
  }
  function spustOdometr(el) {
    if (el.dataset.spusteno) return;
    el.dataset.spusteno = '1';
    $$('.odo-pas', el).forEach((pas) => {
      pas.style.transform = `translate3d(0, calc(-1.05em * ${10 + Number(pas.dataset.cil)}), 0)`;
    });
  }

  const nadpisy = $$('[data-radky]');
  const odometry = $$('[data-odometr]');

  const pozorovatel = new IntersectionObserver((zaznamy) => {
    for (const z of zaznamy) {
      if (!z.isIntersecting) continue;
      const el = z.target;
      if (el.hasAttribute('data-odometr')) {
        if (!scena) { spustOdometr(el); pozorovatel.unobserve(el); }
        continue;
      }
      if (el.closest('.polozka') && scena) continue;
      if (el.hasAttribute('data-radky')) odkryj(el);
      else el.classList.add('je-odkryto');
      pozorovatel.unobserve(el);
    }
  }, { rootMargin: '0px 0px -20% 0px' });

  const vybrane = $('[data-vybrane]');
  const polozky = vybrane ? $$('.polozka', vybrane) : [];
  const media = vybrane ? $$('.medium', vybrane) : [];
  const odometryPolozek = polozky.map((p) => $$('[data-odometr]', p));
  let scena = false;
  let aktivni = null;

  function nastavScenu() {
    scena = mqSiroky.matches && !!vybrane;
    vybrane && vybrane.classList.toggle('vybrane-scena', scena);
    aktivni = null;
  }

  function aktivuj(i) {
    if (i === aktivni) return;
    aktivni = i;
    media.forEach((m, k) => m.classList.toggle('je-aktivni', k === i));
    if (!scena) return;
    polozky.forEach((p, k) => {
      const nazev = $('.polozka-nazev', p);
      if (k === i) {
        p.classList.add('je-aktivni');
        if (klid) { nazev.classList.add('je-odkryto'); }
        else requestAnimationFrame(() => requestAnimationFrame(() => odkryj(nazev)));
      } else {
        p.classList.remove('je-aktivni');
        if (!klid) skryj(nazev);
      }
    });
  }

  function vyberAktivni() {
    if (!media.length) return;
    const stred = innerHeight / 2;
    if (media[0].getBoundingClientRect().top > stred) { aktivuj(-1); return; }
    let nejlepsi = 0, vzdalenost = Infinity;
    media.forEach((m, k) => {
      const r = m.getBoundingClientRect();
      const d = stred < r.top ? r.top - stred : stred > r.bottom ? stred - r.bottom : 0;
      if (d < vzdalenost) { vzdalenost = d; nejlepsi = k; }
    });
    aktivuj(nejlepsi);
    if (scena && odometryPolozek[nejlepsi]) {
      odometryPolozek[nejlepsi].forEach((el) => {
        if (!el.dataset.spusteno && el.getBoundingClientRect().bottom < innerHeight - 8) spustOdometr(el);
      });
    }
  }

  const kurzor = $('[data-kurzor-stitek]');
  const ukazatel = { x: -300, y: -300, cx: -300, cy: -300, w: 0, h: 0, nad: false };
  if (kurzor && jemnyUkazatel) {
    addEventListener('pointermove', (e) => { ukazatel.cx = e.clientX; ukazatel.cy = e.clientY; }, { passive: true });
    $$('[data-kurzor]').forEach((m) => {
      m.addEventListener('pointerenter', (e) => {
        ukazatel.nad = true;
        ukazatel.w = kurzor.offsetWidth; ukazatel.h = kurzor.offsetHeight;
        if (ukazatel.x < -200) { ukazatel.x = e.clientX; ukazatel.y = e.clientY; }
        kurzor.classList.add('je-videt');
      });
      m.addEventListener('pointerleave', () => { ukazatel.nad = false; kurzor.classList.remove('je-videt', 'je-stisk'); });
      m.addEventListener('pointerdown', () => kurzor.classList.add('je-stisk'));
      m.addEventListener('pointerup', () => kurzor.classList.remove('je-stisk'));
    });
  }

  const trat = $('[data-marquee]');
  const pas = trat ? $('.pas-pas', trat) : null;
  const pasStav = { x: 0, v: 0, smer: 1, sada: 0, zaklad: 42 };
  let pasPuvodni = pas ? pas.innerHTML : '';

  function pripravPas() {
    if (!pas) return;
    pas.innerHTML = pasPuvodni;
    const vSade = pas.children.length;
    pasStav.sada = pas.scrollWidth;
    if (klid) { trat.style.overflowX = 'auto'; return; }
    const kopii = Math.max(1, Math.ceil((trat.clientWidth * 2) / Math.max(1, pasStav.sada)));
    for (let i = 0; i < kopii; i++) {
      const tmp = document.createElement('ul');
      tmp.innerHTML = pasPuvodni;
      $$('li', tmp).forEach((li) => { li.setAttribute('aria-hidden', 'true'); pas.appendChild(li); });
    }
    const prvniKopie = pas.children[vSade];
    if (prvniKopie) pasStav.sada = prvniKopie.getBoundingClientRect().left - pas.children[0].getBoundingClientRect().left;
    pasStav.x = pasStav.sada > 0 ? pasStav.x % pasStav.sada : 0;
  }

  const DELKA = 24;
  const FPS = 25;
  const OSA_START = 0.75;
  const OSA_KONEC = 0.45;
  const VY_OKNO = 0.1;
  const tcText = (p) => {
    const sn = Math.round(omez(p, 0, 1) * DELKA * FPS);
    return `01:00:${dvojciferne(Math.floor(sn / FPS))}:${dvojciferne(sn % FPS)}`;
  };
  const cislo = (el, v) => parseFloat(el.style.getPropertyValue(v)) || 0;

  const sekvence = $$('[data-sekvence]').map((el) => {
    const osa = $('[data-osa]', el);
    const nahled = $('[data-nahled]', el);
    const klipy = $$('.klip', osa).map((b) => ({
      el: b,
      i: Number(b.dataset.klip),
      z: cislo(b, '--z'),
      k: cislo(b, '--k'),
      vy: b.hasAttribute('data-vy'),
    }));
    const snimky = nahled ? $$('.nahled-snimek', nahled).map((n) => ({
      el: n,
      ids: n.dataset.klip.trim().split(/\s+/).map(Number),
      svetly: n.hasAttribute('data-svetly'),
      zap: n.classList.contains('je-vybrany'),
    })) : [];
    const park = cislo(osa, '--park');
    return {
      el, osa, park,
      pravitko: $('.osa-pravitko', osa),
      playhead: $('[data-playhead]', osa),
      vlajka: $('[data-playhead-cas]', osa),
      ram: nahled ? $('.nahled-ram', nahled) : null,
      snimky,
      snimek: snimky.find((n) => n.zap) || null,
      seznamKlipu: klipy,
      vybrany: klipy.find((k) => k.el.classList.contains('je-vybrany')) || klipy[0],
      ukazatel: null, fokus: null,
      p: klid ? park : 0, posledniP: -1, posledniTc: '', posledniPosun: '',
      osaY: 0, osaH: 1, sirka: 1, vlajkaW: 0,
    };
  });

  function klipNa(s, p) {
    let vas = null, muj = null, pred = null, prvni = null;
    for (const k of s.seznamKlipu) {
      const pod = p >= k.z && p <= k.k;
      if (k.vy) {
        if (pod && p <= k.z + VY_OKNO) vas = k;
        continue;
      }
      if (pod) muj = k;
      if (k.k <= p && (!pred || k.k > pred.k)) pred = k;
      if (!prvni || k.z < prvni.z) prvni = k;
    }
    return vas || muj || pred || prvni;
  }

  function obnovVyber(s) {
    const k = s.ukazatel || s.fokus || klipNa(s, s.p) || s.vybrany;
    if (!k) return;
    if (k !== s.vybrany) {
      s.vybrany = k;
      for (const c of s.seznamKlipu) {
        const zap = c === k;
        c.el.classList.toggle('je-vybrany', zap);
        c.el.setAttribute('aria-pressed', zap ? 'true' : 'false');
      }
    }
    const sn = s.snimky.find((n) => n.ids.includes(k.i)) || null;
    if (sn && sn !== s.snimek) {
      for (const n of s.snimky) {
        const zap = n === sn;
        if (zap !== n.zap) { n.el.classList.toggle('je-vybrany', zap); n.zap = zap; }
      }
      if (s.ram) s.ram.classList.toggle('je-svetly', sn.svetly);
      s.snimek = sn;
    }
  }

  function odsazeni(el, koren) {
    let y = 0;
    while (el && el !== koren) { y += el.offsetTop; el = el.offsetParent; }
    return y;
  }

  function zmerSekvenci(s) {
    s.sirka = s.pravitko.clientWidth || 1;
    s.vlajkaW = s.vlajka.offsetWidth;
    s.osaY = odsazeni(s.osa, s.el);
    s.osaH = s.osa.offsetHeight;
    s.posledniP = -1;
    s.posledniPosun = '';
    vykresli(s);
    obnovVyber(s);
  }

  function vykresli(s) {
    if (Math.abs(s.p - s.posledniP) < 1e-5) return;
    s.posledniP = s.p;
    const x = s.p * s.sirka;
    s.playhead.style.transform = `translate3d(${x.toFixed(2)}px, 0, 0)`;
    const tc = tcText(s.p);
    if (tc !== s.posledniTc) {
      s.vlajka.textContent = tc;
      s.posledniTc = tc;
    }
    const w = s.vlajkaW;
    let posun = -w / 2;
    if (x + posun < 3) posun = 3 - x;
    if (x + posun + w > s.sirka - 3) posun = s.sirka - 3 - w - x;
    const posunText = posun.toFixed(1);
    if (posunText !== s.posledniPosun) {
      s.vlajka.style.transform = `translateX(${posunText}px)`;
      s.vlajka.style.setProperty('--sipka', `${(-posun).toFixed(1)}px`);
      s.posledniPosun = posunText;
    }
  }

  function aktualizujSekvence() {
    if (klid) return;
    const vh = innerHeight;
    for (const s of sekvence) {
      const r = s.el.getBoundingClientRect();
      if (r.bottom < -200 || r.top > vh + 200) continue;
      const horni = r.top + s.osaY;
      const draha = vh * (OSA_START - OSA_KONEC) + s.osaH;
      s.p = omez((vh * OSA_START - horni) / draha, 0, 1);
      vykresli(s);
      obnovVyber(s);
    }
  }

  sekvence.forEach((s) => {
    s.seznamKlipu.forEach((k) => {
      k.el.addEventListener('pointerenter', (e) => {
        if (e.pointerType === 'touch') return;
        s.ukazatel = k;
        obnovVyber(s);
      });
      k.el.addEventListener('pointerleave', () => {
        if (s.ukazatel !== k) return;
        s.ukazatel = null;
        obnovVyber(s);
      });
      k.el.addEventListener('focus', () => {
        if (!k.el.matches(':focus-visible')) return;
        s.fokus = k;
        obnovVyber(s);
      });
      k.el.addEventListener('blur', () => {
        if (s.fokus !== k) return;
        s.fokus = null;
        obnovVyber(s);
      });
    });
  });

  let skrtnout = $$('[data-skrtni]');
  if (klid) { skrtnout.forEach((li) => li.classList.add('je-skrtnute')); skrtnout = []; }
  function aktualizujSkrtani() {
    if (!skrtnout.length) return;
    const stred = innerHeight / 2;
    skrtnout = skrtnout.filter((li) => {
      const r = li.getBoundingClientRect();
      if (r.top + r.height / 2 <= stred) { li.classList.add('je-skrtnute'); return false; }
      return true;
    });
  }

  const timecode = $('[data-timecode]');
  const tc = { bezi: false, start: 0, posledni: '' };
  if (timecode && !klid) {
    new IntersectionObserver(([z]) => {
      tc.bezi = z.isIntersecting;
      if (tc.bezi && !tc.start) tc.start = performance.now();
    }).observe(timecode);
  }
  function aktualizujTimecode(t) {
    if (!tc.bezi) return;
    const snimky = Math.floor(((t - tc.start) / 1000) * 25);
    const f = snimky % 25, s = Math.floor(snimky / 25) % 60, m = Math.floor(snimky / 1500) % 60, h = Math.floor(snimky / 90000);
    const text = `${dvojciferne(h)}:${dvojciferne(m)}:${dvojciferne(s)}:${dvojciferne(f)}`;
    if (text !== tc.posledni) { timecode.textContent = text; tc.posledni = text; }
  }

  const nav = $('[data-nav]');
  const plochy = $$('[data-povrch]').filter((el) => el !== nav);
  function aktualizujNav() {
    if (!nav) return;
    nav.classList.toggle('je-posunuto', scrollY > 8);
    const y = 36;
    let povrch = 'bila';
    for (const el of plochy) {
      const r = el.getBoundingClientRect();
      if (r.top <= y && r.bottom > y) { povrch = el.dataset.povrch; }
    }
    if (nav.dataset.povrch !== povrch) nav.dataset.povrch = povrch;
  }

  const pata = $('[data-pata]');
  const pataVnitrek = $('[data-pata-vnitrek]');
  function aktualizujPatu() {
    if (!pata || klid) return;
    const r = pata.getBoundingClientRect();
    if (r.top > innerHeight) return;
    const p = omez((innerHeight - r.top) / Math.min(r.height, innerHeight), 0, 1);
    const y = (1 - p) * -Math.min(220, innerHeight * 0.26);
    pataVnitrek.style.transform = y < -0.5 ? `translate3d(0, ${y.toFixed(1)}px, 0)` : '';
  }

  const znacka = $('.pata-znacka');
  function prizpusobZnacku() {
    if (!znacka) return;
    znacka.style.fontSize = '';
    const dostupne = znacka.clientWidth;
    const potreba = znacka.scrollWidth;
    const zaklad = parseFloat(getComputedStyle(znacka).fontSize);
    const text = $('.pata-znacka-text', znacka).getBoundingClientRect().width;
    const tecka = $('.pata-znacka-tecka', znacka).getBoundingClientRect().width;
    const mezera = zaklad * 0.05;
    if (!dostupne || !potreba) return;
    const cil = zaklad * (dostupne / (text + tecka + mezera));
    znacka.style.fontSize = `${Math.floor(cil * 100) / 100}px`;
  }

  let posledniCas = performance.now();
  let posledniScroll = -1;
  let rychlostScrollu = 0;
  let zmenaRozmeru = true;

  function tik(t) {
    const dt = Math.min(0.05, (t - posledniCas) / 1000);
    posledniCas = t;
    if (lenis) lenis.raf(t);

    const sy = scrollY;
    const posunuto = sy !== posledniScroll;
    if (posunuto) {
      const delta = posledniScroll < 0 ? 0 : sy - posledniScroll;
      if (delta > 0.5) pasStav.smer = 1;
      else if (delta < -0.5) pasStav.smer = -1;
      rychlostScrollu = dt > 0 ? Math.abs(delta) / dt : 0;
      posledniScroll = sy;
    } else rychlostScrollu *= 0.9;

    if (posunuto || zmenaRozmeru) {
      aktualizujNav();
      vyberAktivni();
      aktualizujSekvence();
      aktualizujPatu();
      aktualizujSkrtani();
      zmenaRozmeru = false;
    }

    if (pas && !klid && pasStav.sada > 0) {
      const cilV = pasStav.smer * (pasStav.zaklad + Math.min(rychlostScrollu * 0.12, 260));
      pasStav.v += (cilV - pasStav.v) * (1 - Math.exp(-dt / 0.3));
      pasStav.x -= pasStav.v * dt;
      if (pasStav.x <= -pasStav.sada) pasStav.x += pasStav.sada;
      if (pasStav.x > 0) pasStav.x -= pasStav.sada;
      pas.style.transform = `translate3d(${pasStav.x.toFixed(2)}px, 0, 0)`;
    }

    if (kurzor && jemnyUkazatel && (ukazatel.nad || kurzor.classList.contains('je-videt'))) {
      const k = klid ? 1 : 1 - Math.exp(-dt / 0.085);
      ukazatel.x += (ukazatel.cx - ukazatel.x) * k;
      ukazatel.y += (ukazatel.cy - ukazatel.y) * k;
      kurzor.style.transform = `translate3d(${(ukazatel.x - ukazatel.w / 2).toFixed(1)}px, ${(ukazatel.y - ukazatel.h / 2).toFixed(1)}px, 0)`;
    }

    aktualizujTimecode(t);
    requestAnimationFrame(tik);
  }

  let spusteno = false;
  function start() {
    if (spusteno) return;
    spusteno = true;

    nastavScenu();
    if (!klid) {
      nadpisy.forEach(rozdel);
      odometry.forEach(pripravOdometr);
    } else {
      html.classList.remove('js');
    }
    pripravPas();
    sekvence.forEach((s) => {
      s.osa.classList.add('je-zive');
      zmerSekvenci(s);
    });

    if (!klid) {
      const vse = [...nadpisy, ...$$('.nastup')];
      vse.forEach((el) => pozorovatel.observe(el));
      odometry.forEach((el) => pozorovatel.observe(el));
      requestAnimationFrame(() => requestAnimationFrame(() => {
        for (const el of vse) {
          const r = el.getBoundingClientRect();
          if (r.top >= innerHeight || r.bottom <= 0) continue;
          if (el.closest('.polozka') && scena) continue;
          if (el.hasAttribute('data-radky')) odkryj(el); else el.classList.add('je-odkryto');
          pozorovatel.unobserve(el);
        }
      }));
    }
    prizpusobZnacku();
    requestAnimationFrame(tik);
  }

  const pismaHotova = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  Promise.race([pismaHotova, new Promise((r) => setTimeout(r, 1800))]).then(start);

  let sirka = innerWidth;
  let casovac = 0;
  addEventListener('resize', () => {
    zmenaRozmeru = true;
    clearTimeout(casovac);
    casovac = setTimeout(() => {
      sekvence.forEach(zmerSekvenci);
      if (innerWidth === sirka) return;
      sirka = innerWidth;
      const bylaScena = scena;
      nastavScenu();
      if (!klid) {
        nadpisy.forEach((el) => {
          const odkryto = el.classList.contains('je-odkryto');
          el.classList.remove('je-rozdeleno', 'je-odkryto');
          el.innerHTML = puvodniHtml.get(el) || el.innerHTML;
          rozdel(el);
          if (odkryto || (bylaScena !== scena)) {
            el.classList.add('je-odkryto');
            $$('.maska', el).forEach((m) => m.classList.add('je-hotovo'));
          }
        });
      }
      pripravPas();
      prizpusobZnacku();
      zmenaRozmeru = true;
    }, 180);
  });
})();
addEventListener('load', function () {
  var h = location.hash;
  if (h.length < 2) return;
  var cil = null;
  try { cil = document.querySelector(h); } catch (e) { return; }
  if (!cil) return;
  // stejná cesta jako klik v liště (vyhlazené dojetí); bez odkazu aspoň obyčejný posun
  setTimeout(function () {
    var odkaz = document.querySelector('a[href="' + h + '"]');
    if (odkaz) odkaz.click(); else cil.scrollIntoView({ behavior: 'auto' });
  }, 300);
});
