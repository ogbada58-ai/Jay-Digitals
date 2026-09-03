const menu = document.querySelector('.menu');
const links = document.querySelector('.nav-links');

function closeMenu() {
  menu?.classList.remove('active');
  menu?.setAttribute('aria-expanded', 'false');
  menu?.setAttribute('aria-label', 'Open navigation menu');
  links?.classList.remove('open');
}

menu?.addEventListener('click', () => {
  const isOpen = links?.classList.toggle('open');
  menu.classList.toggle('active', isOpen);
  menu.setAttribute('aria-expanded', String(Boolean(isOpen)));
  menu.setAttribute('aria-label', isOpen ? 'Close navigation menu' : 'Open navigation menu');
});

links?.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeMenu));
window.addEventListener('resize', () => { if (window.innerWidth > 800) closeMenu(); });

const revealItems = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  revealItems.forEach((item) => observer.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add('visible'));
}

const filters = document.querySelectorAll('.filter');
const projects = document.querySelectorAll('.portfolio-card');
projects.forEach((project, index) => {
  project.dataset.category = ['brand', 'social', 'digital'][index] || 'brand';
});

filters.forEach((filter) => filter.addEventListener('click', () => {
  filters.forEach((button) => button.classList.remove('active'));
  filter.classList.add('active');
  const category = filter.dataset.filter;
  projects.forEach((project) => {
    const show = category === 'all' || project.dataset.category === category;
    project.classList.toggle('hidden', !show);
  });
}));