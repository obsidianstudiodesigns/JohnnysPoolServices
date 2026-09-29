import { LOGOS, svgDoc } from './logos-data.js?v=3';

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ----- logo marks -----
for (const el of document.querySelectorAll('[data-logo]')) {
  const logo = LOGOS.find((l) => l.id === el.dataset.logo) || LOGOS[0];
  el.innerHTML = svgDoc(logo.mark('dark'), '0 0 120 120', { title: '' });
}

// ----- header turns solid once the hero scrolls away -----
const header = document.querySelector('.site-header');
const syncHeader = () => header.classList.toggle('is-solid', window.scrollY > 24);
window.addEventListener('scroll', syncHeader, { passive: true });
syncHeader();

// ----- WebGL: hero water and the 3D pool tour -----
Promise.all([import('./hero-water.js?v=20'), import('./pool-scene.js?v=25')]).then(([heroMod, sceneMod]) => {
  heroMod.initHeroWater(document.querySelector('.hero-water'), { reducedMotion });

  // build the 3D tour only when it is about to scroll into view
  const stageEl = document.getElementById('pool-stage');
  let scene = null;
  const startScene = new IntersectionObserver(([e]) => {
    if (!e.isIntersecting) return;
    startScene.disconnect();
    try { scene = sceneMod.initPoolScene(stageEl, { reducedMotion }); } catch (err) { console.warn('3D tour unavailable', err); }
    scene?.setShot(active ? active.dataset.shot : 'overview');
  }, { rootMargin: '0px 0px 120% 0px' });
  startScene.observe(stageEl);

  const caption = document.getElementById('stage-caption');
  const items = [...document.querySelectorAll('.svc')];
  let active = null;
  const activate = (item) => {
    if (item === active) return;
    active?.classList.remove('is-active');
    active = item;
    if (item) item.classList.add('is-active');
    caption.textContent = item && item.dataset.shot !== 'overview' ? item.querySelector('h3').textContent : 'The whole setup';
    scene?.setShot(item ? item.dataset.shot : 'overview');
  };

  // the item crossing the middle band of the viewport drives the camera
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) activate(e.target);
  }, {
    // on phones the 3D stage sticks to the top half, so watch a band just below it
    rootMargin: window.matchMedia('(max-width: 900px)').matches ? '-62% 0px -30% 0px' : '-45% 0px -45% 0px',
  });
  items.forEach((i) => io.observe(i));

  // back above the first service: show the overview again
  window.addEventListener('scroll', () => {
    const first = items[0].getBoundingClientRect();
    if (first.top > window.innerHeight * 0.7) activate(null);
  }, { passive: true });
}).catch((err) => console.warn('WebGL modules failed to load', err));

// ----- our work: tap a photo to see it large, with previous / next -----
const lightbox = document.getElementById('lightbox');
const lbImg = lightbox.querySelector('.lightbox-img');
const lbCap = lightbox.querySelector('.lightbox-caption');
const shots = [...document.querySelectorAll('.work-open')];
let shotIndex = 0;
const showShot = (i) => {
  shotIndex = (i + shots.length) % shots.length;
  const btn = shots[shotIndex];
  const img = btn.querySelector('img');
  lbImg.src = btn.dataset.full;
  lbImg.alt = img.alt;
  lbCap.textContent = btn.closest('figure').querySelector('.work-title').textContent;
};
shots.forEach((btn, i) => btn.addEventListener('click', () => { showShot(i); lightbox.showModal(); }));
lightbox.querySelectorAll('[data-step]').forEach((b) => b.addEventListener('click', () => showShot(shotIndex + Number(b.dataset.step))));
lightbox.querySelector('.lb-close').addEventListener('click', () => lightbox.close());
lightbox.addEventListener('click', (e) => { if (e.target === lightbox) lightbox.close(); });
lightbox.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowRight') showShot(shotIndex + 1);
  if (e.key === 'ArrowLeft') showShot(shotIndex - 1);
});
lightbox.addEventListener('close', () => shots[shotIndex].focus());

// ----- "Ask about ..." links preselect the service in the form -----
const form = document.getElementById('quote-form');
const serviceSel = document.getElementById('f-service');
document.querySelectorAll('[data-service]').forEach((a) => a.addEventListener('click', () => {
  serviceSel.value = a.dataset.service;
}));

// ----- quote form: builds a WhatsApp or email message, no server needed -----
const errorEl = document.getElementById('form-error');
form.addEventListener('submit', (e) => {
  e.preventDefault();
  const via = e.submitter?.value || 'whatsapp';
  const f = Object.fromEntries(new FormData(form));
  const missing = [];
  for (const [key, label] of [['name', 'your name'], ['message', 'a few words about the pool']]) {
    const input = form.elements[key];
    const empty = !f[key].trim();
    input.setAttribute('aria-invalid', empty ? 'true' : 'false');
    if (empty) missing.push(label);
  }
  if (missing.length) {
    errorEl.textContent = `Add ${missing.join(' and ')} so Johnny knows what the job is.`;
    errorEl.hidden = false;
    form.querySelector('[aria-invalid="true"]').focus();
    return;
  }
  errorEl.hidden = true;

  const lines = [`Hi Johnny, this is ${f.name.trim()}.`, `I need help with: ${f.service}.`];
  if (f.area.trim()) lines.push(`Suburb: ${f.area.trim()}`);
  if (f.phone.trim()) lines.push(`My number: ${f.phone.trim()}`);
  lines.push('', f.message.trim());
  const text = lines.join('\n');

  if (via === 'email') {
    const subject = `Quote request: ${f.service}`;
    window.location.href = `mailto:johnvdbergmsp@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
  } else {
    window.open(`https://wa.me/27617658479?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
  }
});

document.getElementById('year').textContent = new Date().getFullYear();
