var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ===========================
// Header: navy fade over the hero at the top, white bar once the page scrolls
// ===========================
(function () {
    var header = document.getElementById('mainNav');
    if (!header) return;

    var menu = document.getElementById('navbarNav');
    var menuOpen = false;
    var ticking = false;

    function update() {
        ticking = false;
        // data-header="solid": pages without a navy hero keep the white bar
        var solid = header.dataset.header === 'solid' || menuOpen || window.scrollY > 12;
        header.classList.toggle('is-solid', solid);
    }

    window.addEventListener('scroll', function () {
        if (!ticking) {
            ticking = true;
            requestAnimationFrame(update);
        }
    }, { passive: true });

    if (menu) {
        // The open mobile menu needs the white background behind its links
        menu.addEventListener('show.bs.collapse', function () {
            menuOpen = true;
            update();
        });
        menu.addEventListener('hidden.bs.collapse', function () {
            menuOpen = false;
            update();
        });
    }

    update();
})();

// ===========================
// Smooth Scroll for Anchor Links
// ===========================
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const id = this.getAttribute('href');
        // Bare "#" links are placeholders or handled by page scripts
        if (id === '#') {
            e.preventDefault();
            return;
        }
        const target = document.querySelector(id);
        if (target) {
            e.preventDefault();
            const navbarHeight = document.querySelector('.navbar').offsetHeight;
            const targetPosition = target.offsetTop - navbarHeight;

            window.scrollTo({
                top: targetPosition,
                behavior: prefersReducedMotion ? 'auto' : 'smooth'
            });

            // Close mobile menu if open
            const navbarCollapse = document.querySelector('.navbar-collapse');
            if (navbarCollapse.classList.contains('show')) {
                bootstrap.Collapse.getOrCreateInstance(navbarCollapse).hide();
            }
        }
    });
});

// ===========================
// Stats Counter Animation
// ===========================
function animateStats() {
    const stats = document.querySelectorAll('.stat-number');

    stats.forEach(stat => {
        const target = parseInt(stat.getAttribute('data-target'), 10);
        const suffix = stat.textContent.includes('+') ? '+' : stat.textContent.includes('%') ? '%' : '';
        const format = (n) => n.toLocaleString('sr-RS') + suffix;

        // Lock the box to the final value's width so the row doesn't shift while counting.
        // (Neither site font has tabular figures, so tabular-nums alone can't do this.)
        stat.textContent = format(target);
        if (prefersReducedMotion) return;
        stat.style.minWidth = stat.getBoundingClientRect().width + 'px';

        const duration = 1200;
        const start = performance.now();

        const tick = (now) => {
            const t = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - t, 3);
            stat.textContent = format(Math.round(target * eased));
            if (t < 1) requestAnimationFrame(tick);
        };

        requestAnimationFrame(tick);
    });
}

// Intersection Observer for Stats Animation
const statsSection = document.querySelector('.stats-section');
if (statsSection) {
    const statsObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateStats();
                statsObserver.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.5,
        rootMargin: '0px 0px -100px 0px'
    });

    statsObserver.observe(statsSection);
}

// ===========================
// Step Cards Animation on Scroll
// ===========================
const stepCards = document.querySelectorAll('.step-card');
if (stepCards.length > 0 && !prefersReducedMotion) {
    const stepObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry, index) => {
            if (entry.isIntersecting) {
                const card = entry.target;
                setTimeout(() => {
                    card.style.opacity = '1';
                    card.style.transform = 'translateY(0)';
                }, index * 100);
                // Drop the reveal styles afterwards so they don't override the stylesheet
                card.addEventListener('transitionend', () => {
                    ['opacity', 'transform', 'transition'].forEach(prop => card.style.removeProperty(prop));
                }, { once: true });
                stepObserver.unobserve(card);
            }
        });
    }, {
        threshold: 0.2
    });

    stepCards.forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(24px)';
        card.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';
        stepObserver.observe(card);
    });
}

// ===========================
// Mobile Menu Close on Outside Click
// ===========================
document.addEventListener('click', function(e) {
    const navbar = document.querySelector('.navbar');
    const navbarCollapse = document.querySelector('.navbar-collapse');

    if (navbarCollapse && navbarCollapse.classList.contains('show')) {
        if (!navbar.contains(e.target)) {
            bootstrap.Collapse.getOrCreateInstance(navbarCollapse).hide();
        }
    }
});

// ===========================
// Opening hours badge (kontakt.html) — computed in Novi Sad time, hidden until known
// ===========================
(function () {
    const badge = document.getElementById('openStatus');
    if (!badge) return;

    const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Europe/Belgrade',
        weekday: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23'
    }).formatToParts(new Date());
    const part = (type) => parts.find(p => p.type === type).value;

    // Same hours as listed on the page: Mon–Fri 09–20, Sat 10–16, Sunday by appointment
    const hours = { Mon: [9, 20], Tue: [9, 20], Wed: [9, 20], Thu: [9, 20], Fri: [9, 20], Sat: [10, 16] };
    const today = hours[part('weekday')];
    const minutes = Number(part('hour')) * 60 + Number(part('minute'));
    const open = Boolean(today) && minutes >= today[0] * 60 && minutes < today[1] * 60;

    badge.classList.toggle('is-closed', !open);
    badge.querySelector('.open-status-text').textContent = open ? 'Trenutno otvoreno' : 'Trenutno zatvoreno';
    badge.hidden = false;
})();

// ===========================
// Form Validation Enhancement
// ===========================
(function() {
    'use strict';

    // Fetch all forms that need validation
    const forms = document.querySelectorAll('.needs-validation');

    Array.from(forms).forEach(form => {
        form.addEventListener('submit', event => {
            if (!form.checkValidity()) {
                event.preventDefault();
                event.stopPropagation();
            }

            form.classList.add('was-validated');
        }, false);
    });
})();
