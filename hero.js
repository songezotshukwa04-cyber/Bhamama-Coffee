document.addEventListener('DOMContentLoaded', () => {
    const hero = document.getElementById('cup-hero');
    const cup = document.querySelector('.hero-cup');
    const content = document.querySelector('.cup-hero-content');

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion || !hero || !cup || !content) return; // skip scroll animation entirely, keep static layout

    let ticking = false;

    function updateHero() {
        const heroHeight = hero.offsetHeight;
        const progress = Math.min(window.scrollY / heroHeight, 1);

        cup.style.transform = `translateX(-50%) scale(${1 + progress * 0.5})`;
        content.style.opacity = Math.max(1 - progress * 1.8, 0);
        content.style.transform = `translateY(${progress * -30}px)`;

        ticking = false;
    }

    window.addEventListener('scroll', () => {
        if (!ticking) {
            requestAnimationFrame(updateHero);
            ticking = true;
        }
    });
});