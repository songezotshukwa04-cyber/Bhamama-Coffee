// Mobile hamburger nav toggle
document.addEventListener('DOMContentLoaded', () => {
    const toggleBtn = document.getElementById('nav-toggle');
    const navList = document.getElementById('main-nav-list');

    if (!toggleBtn || !navList) return;

    toggleBtn.addEventListener('click', () => {
        const isOpen = navList.classList.toggle('nav-open');
        toggleBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });

    // Close the menu after tapping a nav link (better mobile UX)
    navList.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            navList.classList.remove('nav-open');
            toggleBtn.setAttribute('aria-expanded', 'false');
        });
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && navList.classList.contains('nav-open')) {
            navList.classList.remove('nav-open');
            toggleBtn.setAttribute('aria-expanded', 'false');
            toggleBtn.focus();
        }
    });
});
