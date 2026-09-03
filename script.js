const menu = document.querySelector('.menu');
const links = document.querySelector('.nav-links');

function closeMenu() {
  menu?.classList.remove('active');
  menu?.setAttribute('aria-expanded', 'false');
  links?.classList.remove('open');
}

menu?.addEventListener('click', () => {
  const isOpen = links?.classList.toggle('open');
  menu.classList.toggle('active', isOpen);
  menu.setAttribute('aria-expanded', String(Boolean(isOpen)));
  menu.setAttribute('aria-label', isOpen ? 'Close navigation menu' : 'Open navigation menu');
});

links?.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', closeMenu);
});

window.addEventListener('resize', () => {
  if (window.innerWidth > 800) closeMenu();
});

const revealItems = document.querySelectorAll('.reveal');
const observer = new IntersectionObserver((entries, obs) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      obs.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

revealItems.forEach((item) => observer.observe(item));