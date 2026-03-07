// ===========================
// Navbar Scroll Effect
// ===========================
window.addEventListener('scroll', function() {
    const navbar = document.getElementById('mainNav');
    if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
});

// ===========================
// Smooth Scroll for Anchor Links
// ===========================
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            const navbarHeight = document.querySelector('.navbar').offsetHeight;
            const targetPosition = target.offsetTop - navbarHeight;
            
            window.scrollTo({
                top: targetPosition,
                behavior: 'smooth'
            });
            
            // Close mobile menu if open
            const navbarCollapse = document.querySelector('.navbar-collapse');
            if (navbarCollapse.classList.contains('show')) {
                const bsCollapse = new bootstrap.Collapse(navbarCollapse);
                bsCollapse.hide();
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
        const target = parseInt(stat.getAttribute('data-target'));
        const suffix = stat.textContent.includes('+') ? '+' : stat.textContent.includes('%') ? '%' : '';
        let current = 0;
        const increment = target / 50;
        
        const updateCounter = () => {
            current += increment;
            if (current < target) {
                stat.textContent = Math.floor(current).toLocaleString() + suffix;
                setTimeout(updateCounter, 30);
            } else {
                stat.textContent = target.toLocaleString() + suffix;
            }
        };
        
        updateCounter();
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
// Property Cards Hover Effect
// ===========================
const propertyCards = document.querySelectorAll('.property-card');
propertyCards.forEach(card => {
    card.addEventListener('mouseenter', function() {
        this.style.transform = 'translateY(-8px)';
    });
    
    card.addEventListener('mouseleave', function() {
        this.style.transform = 'translateY(0)';
    });
});

// ===========================
// Step Cards Animation on Scroll
// ===========================
const stepCards = document.querySelectorAll('.step-card');
if (stepCards.length > 0) {
    const stepObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry, index) => {
            if (entry.isIntersecting) {
                setTimeout(() => {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }, index * 100);
                stepObserver.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.2
    });
    
    stepCards.forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(30px)';
        card.style.transition = 'all 0.6s ease';
        stepObserver.observe(card);
    });
}

// ===========================
// Team Cards Animation on Scroll
// ===========================
const teamCards = document.querySelectorAll('.team-card');
if (teamCards.length > 0) {
    const teamObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry, index) => {
            if (entry.isIntersecting) {
                setTimeout(() => {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }, index * 100);
                teamObserver.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.2
    });
    
    teamCards.forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(30px)';
        card.style.transition = 'all 0.6s ease';
        teamObserver.observe(card);
    });
}

// ===========================
// Search Form Submission Handler
// ===========================
const searchForm = document.querySelector('.search-form');
if (searchForm) {
    searchForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const location = document.getElementById('location').value;
        const propertyType = document.getElementById('property-type').value;
        const priceRange = document.getElementById('price-range').value;
        
        console.log('Search parameters:', {
            location,
            propertyType,
            priceRange
        });
        alert(`Pretraga: ${location}, ${propertyType}, ${priceRange}`);
    });
}

// ===========================
// Property Card Click Handler
// ===========================
propertyCards.forEach(card => {
    card.addEventListener('click', function() {
        const propertyTitle = this.querySelector('.property-title').textContent;
        console.log('Clicked property:', propertyTitle);
    });
});

// ===========================
// Initialize AOS (Animate on Scroll) - Optional
// ===========================

// ===========================
// Contact Buttons Click Tracking
// ===========================
const ctaButtons = document.querySelectorAll('.btn-primary-cta, .btn-secondary-cta');
ctaButtons.forEach(button => {
    button.addEventListener('click', function(e) {
        const buttonText = this.textContent.trim();
        console.log('CTA Button clicked:', buttonText);
    });
});

// ===========================
// Lazy Loading Images
// ===========================
if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                if (img.dataset.src) {
                    img.src = img.dataset.src;
                    img.removeAttribute('data-src');
                }
                observer.unobserve(img);
            }
        });
    });

    // Za implementaciju lazy loading-a, zamenite src sa data-src u HTML-u
    const lazyImages = document.querySelectorAll('img[data-src]');
    lazyImages.forEach(img => imageObserver.observe(img));
}

// ===========================
// Mobile Menu Close on Outside Click
// ===========================
document.addEventListener('click', function(e) {
    const navbar = document.querySelector('.navbar');
    const navbarCollapse = document.querySelector('.navbar-collapse');
    const navbarToggler = document.querySelector('.navbar-toggler');
    
    if (navbarCollapse && navbarCollapse.classList.contains('show')) {
        if (!navbar.contains(e.target)) {
            const bsCollapse = new bootstrap.Collapse(navbarCollapse);
            bsCollapse.hide();
        }
    }
});

// ===========================
// FAQ Accordion Custom Behavior
// ===========================
const accordionButtons = document.querySelectorAll('.accordion-button');
accordionButtons.forEach(button => {
    button.addEventListener('click', function() {
        console.log('FAQ opened:', this.textContent.trim());
    });
});

// ===========================
// Window Load Event
// ===========================
window.addEventListener('load', function() {
    console.log('Page fully loaded');
    
    // Ovde možete dodati kod koji treba da se izvrši nakon potpunog učitavanja stranice
    // Na primer, init Google Analytics, Facebook Pixel, itd.
});

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

// ===========================
// Console Welcome Message
// ===========================
console.log('%c Premium Nekretnine ', 'background: #0F172A; color: #C9A227; font-size: 20px; padding: 10px;');
console.log('%c Dobrodošli na naš sajt! ', 'background: #C9A227; color: #fff; font-size: 14px; padding: 5px;');
