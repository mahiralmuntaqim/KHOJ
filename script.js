// ── Mobile Menu ──
const hamburger = document.getElementById('hamburger');
const mobileMenu = document.getElementById('mobileMenu');

hamburger.addEventListener('click', () => {
  mobileMenu.classList.toggle('open');
});

// Close mobile menu on link click
mobileMenu.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => mobileMenu.classList.remove('open'));
});

// ── Category Tabs ──
const tabs = document.querySelectorAll('.ctab');
const cards = document.querySelectorAll('.listing-card');

tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    tabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');

    const cat = tab.dataset.cat;
    cards.forEach(card => {
      if (cat === 'all' || card.dataset.cat === cat) {
        card.classList.remove('hidden');
      } else {
        card.classList.add('hidden');
      }
    });
  });
});

// ── Quick Tags ──
document.querySelectorAll('.qtag').forEach(tag => {
  tag.addEventListener('click', () => {
    document.getElementById('searchInput').value = tag.textContent;
    document.getElementById('searchInput').focus();
  });
});

// ── Search Button ──
document.getElementById('searchBtn').addEventListener('click', () => {
  const query = document.getElementById('searchInput').value.trim();
  const category = document.getElementById('categorySelect').value;
  if (query || category) {
    // Placeholder — wire to backend later
    console.log('Search:', { query, category });
    alert(`Searching for "${query}" in "${category || 'All Categories'}" — backend coming soon!`);
  }
});

// ── Scroll fade-in for sections ──
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = '1';
      entry.target.style.transform = 'translateY(0)';
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll('.listing-card, .rental-card, .step-card, .testi-card').forEach(el => {
  el.style.opacity = '0';
  el.style.transform = 'translateY(20px)';
  el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
  observer.observe(el);
});