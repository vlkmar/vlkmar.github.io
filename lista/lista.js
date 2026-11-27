(function () {
  var MERENI = window.VLK_MERENI || {};

  function nactiGA4() {
    if (!MERENI.ga4 || window.__vlkGA4) return;
    window.__vlkGA4 = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', MERENI.ga4);
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(MERENI.ga4);
    document.head.appendChild(s);
  }

  function nactiPixel() {
    if (!MERENI.pixel || window.fbq) return;
    var n = window.fbq = function () {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    };
    if (!window._fbq) window._fbq = n;
    n.push = n; n.loaded = true; n.version = '2.0'; n.queue = [];
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://connect.facebook.net/en_US/fbevents.js';
    document.head.appendChild(s);
    window.fbq('init', MERENI.pixel);
    window.fbq('track', 'PageView');
  }

  function podleSouhlasu() {
    if (CookieConsent.acceptedCategory('analytics')) nactiGA4();
    if (CookieConsent.acceptedCategory('advertisement')) nactiPixel();
  }

  function poZmene(udalost) {
    var zmeny = (udalost && udalost.changedCategories) || [];
    var odvolano = zmeny.some(function (k) { return !CookieConsent.acceptedCategory(k); });
    if (odvolano) location.reload(); else podleSouhlasu();
  }

  CookieConsent.run({
    cookie: { name: 'cc_cookie', expiresAfterDays: 365 },
    revision: 1,
    hideFromBots: true,
    disablePageInteraction: false,
    guiOptions: {
      consentModal: { layout: 'box', position: 'bottom right', equalWeightButtons: true, flipButtons: false },
      preferencesModal: { layout: 'box', equalWeightButtons: true, flipButtons: false }
    },
    categories: {
      necessary: { enabled: true, readOnly: true },
      analytics: {
        autoClear: { cookies: [{ name: /^_ga/ }] }
      },
      advertisement: {
        autoClear: { cookies: [{ name: '_fbp' }, { name: '_fbc' }] }
      }
    },
    onFirstConsent: podleSouhlasu,
    onConsent: podleSouhlasu,
    onChange: poZmene,
    language: {
      default: 'cs',
      translations: {
        cs: {
          consentModal: {
            title: 'Cookies',
            description: 'Web funguje i&nbsp;bez nich. Se souhlasem zapnu Google Analytics a&nbsp;Meta pixel. Uvidím, odkud lidé chodí, a&nbsp;budu moct měřit reklamu.',
            acceptAllBtn: 'Přijmout vše',
            acceptNecessaryBtn: 'Odmítnout vše',
            showPreferencesBtn: 'Nastavení',
            footer: '<a href="/zasady/#cookies">Zásady ochrany osobních údajů</a>'
          },
          preferencesModal: {
            title: 'Nastavení cookies',
            acceptAllBtn: 'Přijmout vše',
            acceptNecessaryBtn: 'Odmítnout vše',
            savePreferencesBtn: 'Uložit volbu',
            closeIconLabel: 'Zavřít',
            sections: [
              {
                description: 'Vyberte, co smím zapnout. Volbu můžete kdykoli změnit odkazem „Nastavení cookies“. Podrobnosti jsou v&nbsp;<a href="/zasady/#cookies">zásadách</a>.'
              },
              {
                title: 'Nezbytné',
                description: 'Pamatují si vaši volbu v&nbsp;této liště. Bez nich by se vás web ptal na každé stránce.',
                linkedCategory: 'necessary'
              },
              {
                title: 'Měření návštěvnosti',
                description: 'Google Analytics: kolik lidí web navštěvuje, odkud přicházejí a&nbsp;co na něm dělají.',
                linkedCategory: 'analytics'
              },
              {
                title: 'Reklama',
                description: 'Meta pixel: měření reklamy na Facebooku a&nbsp;Instagramu a&nbsp;její zobrazení lidem, kteří web navštívili.',
                linkedCategory: 'advertisement'
              }
            ]
          }
        }
      }
    }
  });

  document.addEventListener('click', function (e) {
    var odkaz = e.target.closest && e.target.closest('[data-cc="nastaveni"]');
    if (!odkaz) return;
    e.preventDefault();
    CookieConsent.showPreferences();
  });
})();
