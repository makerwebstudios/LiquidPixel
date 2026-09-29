document.addEventListener('DOMContentLoaded', () => {
    // Dynamic year
    const yearEl = document.getElementById('current-year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    // Navbar scroll effect
    const navbar = document.querySelector('.navbar');
    window.addEventListener('scroll', () => {
        navbar.classList.toggle('scrolled', window.scrollY > 50);
    });

    // Mobile nav toggle
    const navToggle = document.querySelector('.nav-toggle');
    const navLinks = document.querySelector('.nav-links');
    if (navToggle && navLinks) {
        // House standard: the menu is CAPTIVE — the page behind it must not
        // scroll. overflow:hidden alone does not hold on iOS touch, so the
        // body is pinned with position:fixed and the scroll position is
        // restored on close (otherwise closing jumps you to the top).
        let lockedAt = 0;
        const lock = () => {
            lockedAt = window.scrollY;
            document.body.style.position = 'fixed';
            document.body.style.top = `-${lockedAt}px`;
            document.body.style.width = '100%';
            document.body.style.overflow = 'hidden';
        };
        const unlock = () => {
            document.body.style.position = '';
            document.body.style.top = '';
            document.body.style.width = '';
            document.body.style.overflow = '';
            window.scrollTo(0, lockedAt);
        };
        const setMenu = (open) => {
            navToggle.classList.toggle('open', open);
            navLinks.classList.toggle('open', open);
            navToggle.setAttribute('aria-expanded', String(open));
            open ? lock() : unlock();
        };

        navToggle.setAttribute('aria-expanded', 'false');
        navToggle.addEventListener('click', () => {
            setMenu(!navLinks.classList.contains('open'));
        });
        navLinks.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => setMenu(false));
        });
        // A way out that is not the burger itself.
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && navLinks.classList.contains('open')) setMenu(false);
        });
    }

    // Carousel
    const track = document.getElementById('carousel-track');
    const prevBtn = document.getElementById('prev-tour');
    const nextBtn = document.getElementById('next-tour');

    if (track && prevBtn && nextBtn) {
        const scrollAmount = () => {
            const card = track.querySelector('.carousel-card');
            return card ? card.offsetWidth + 24 : 300;
        };

        nextBtn.addEventListener('click', () => {
            track.scrollBy({ left: scrollAmount(), behavior: 'smooth' });
        });

        prevBtn.addEventListener('click', () => {
            track.scrollBy({ left: -scrollAmount(), behavior: 'smooth' });
        });
    }
});

/* ═══════════════════════════════════════════════════════════════════════════
   CONTACT FORM + CONVERSION TRACKING          added 2026-09-28
   Deliberately OUTSIDE the DOMContentLoaded block above: these are delegated
   listeners on document, so they work no matter when they run, and a throw in
   the carousel code can't take them down with it.
   ═══════════════════════════════════════════════════════════════════════════ */

/* MWS standard — auto-format US phone inputs as 123-456-7890.
   Delegated, so it also catches fields rendered after load, and normalizes
   pasted numbers. */
(function () {
  document.addEventListener('input', function (e) {
    var el = e.target;
    if (!el || !el.matches) return;
    if (!el.matches('input[type="tel"],input[inputmode="tel"],input[autocomplete="tel"]')) return;
    var d = el.value.replace(/\D/g, '').slice(0, 10);
    el.value = d.length > 6 ? d.slice(0, 3) + '-' + d.slice(3, 6) + '-' + d.slice(6)
             : d.length > 3 ? d.slice(0, 3) + '-' + d.slice(3)
             : d;
  }, true);
})();

/* GA4 — phone_click. The property recorded 0 key events for its first 28 days
   because nothing on the site ever fired one. */
(function () {
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest ? e.target.closest('a[href^="tel:"]') : null;
    if (!a || typeof gtag !== 'function') return;
    gtag('event', 'phone_click', {
      link_url: a.getAttribute('href'),
      link_text: (a.textContent || '').trim().slice(0, 100)
    });
  }, true);
})();

/* Contact form — AJAX submit to Web3Forms with an in-page result panel.
   Web3Forms' own Redirect URL is ignored once JS handles the submit, so the
   panel IS the confirmation; without it a success looks identical to a
   failure. */
(function () {
  var form = document.getElementById('contactForm');
  if (!form) return;

  var out = document.getElementById('lpResult');
  var btn = document.getElementById('lpSubmit');
  var FALLBACK = 'Call <a href="tel:+19568029541">(956) 802-9541</a> or email ' +
                 '<a href="mailto:rc@liquidpixel.io">rc@liquidpixel.io</a>.';

  function show(kind, html) {
    out.className = 'lp-result is-shown ' + (kind === 'ok' ? 'is-ok' : 'is-err');
    out.innerHTML = html;
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    if (!form.reportValidity()) return;

    var key = form.querySelector('[name="access_key"]').value;
    if (!key || key.indexOf('REPLACE_') === 0) {
      // Fail loudly for us, gracefully for the visitor. A form that posts to a
      // dead key returns a plausible-looking error and eats the enquiry.
      console.error('[LPX] Web3Forms access_key is still the placeholder — submissions are NOT being delivered.');
      show('err', '<strong>This form is not live yet.</strong><br>' + FALLBACK);
      return;
    }

    btn.disabled = true;
    var label = btn.textContent;
    btn.textContent = 'Sending…';

    fetch(form.action, {
      method: 'POST',
      headers: { 'Accept': 'application/json' },
      body: new FormData(form)
    })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (res) {
        if (!res.ok || res.j.success === false) throw new Error(res.j.message || 'Submission rejected');

        show('ok', '<strong>Thank you — we have it.</strong><br>' +
                   'RC will get back to you within one business day. If it is urgent, ' + FALLBACK);
        form.querySelectorAll('input:not([type="hidden"]), select, textarea')
            .forEach(function (f) { if (f.type === 'checkbox') { f.checked = false; } else { f.value = ''; } });

        if (typeof gtag === 'function') {
          gtag('event', 'generate_lead',   { form_id: 'contactForm' });
          gtag('event', 'contact_submit',  { form_id: 'contactForm' });
        }
      })
      .catch(function (err) {
        console.error('[LPX] contact form submit failed:', err);
        show('err', '<strong>That did not go through.</strong><br>' + FALLBACK);
      })
      .finally(function () {
        btn.disabled = false;
        btn.textContent = label;
        out.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
  });
})();
