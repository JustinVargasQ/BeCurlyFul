import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(useGSAP, ScrollTrigger);

/**
 * GSAP enhancements for the home page. Coexists with framer-motion
 * by targeting only new/decorative elements that framer-motion does not touch:
 *  - `.section-title` gets an accent line drawn underneath on scroll
 *  - `[data-parallax]` elements move at a fraction of scroll speed
 *  - `.gsap-float` elements get a slow infinite float + rotate
 */
export function useHomeAnimations(scopeRef) {
  useGSAP(() => {
    /* ── 1. Section title accent underline ──────────────────── */
    /* Inject a small <span class="title-accent"> after each .section-title
       (only once) and animate scaleX from 0 → 1 when in view. */
    const titles = gsap.utils.toArray('.section-title');
    titles.forEach((el) => {
      if (el.querySelector('.title-accent')) return;
      const accent = document.createElement('span');
      accent.className = 'title-accent';
      Object.assign(accent.style, {
        display: 'block',
        marginTop: '14px',
        height: '3px',
        width: '64px',
        borderRadius: '999px',
        background: 'linear-gradient(90deg, #B85F72 0%, #C9A875 100%)',
        transformOrigin: 'left center',
        transform: 'scaleX(0)',
      });
      el.appendChild(accent);

      gsap.to(accent, {
        scaleX: 1,
        duration: 0.9,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: el,
          start: 'top 85%',
          toggleActions: 'play none none reverse',
        },
      });
    });

    /* ── 2. Subtle parallax on decorated layers ─────────────── */
    gsap.utils.toArray('[data-parallax]').forEach((el) => {
      const speed = parseFloat(el.dataset.parallax) || 0.2;
      gsap.fromTo(el,
        { yPercent: speed * 50 },
        {
          yPercent: speed * -50,
          ease: 'none',
          scrollTrigger: {
            trigger: el,
            start: 'top bottom',
            end: 'bottom top',
            scrub: true,
          },
        }
      );
    });

    /* ── 3. Slow floating decoration (infinite) ─────────────── */
    gsap.utils.toArray('.gsap-float').forEach((el, i) => {
      const dur = 6 + (i % 3) * 1.4;
      gsap.to(el, {
        y: '+=18',
        x: i % 2 === 0 ? '+=10' : '-=10',
        rotation: i % 2 === 0 ? 6 : -6,
        duration: dur,
        ease: 'sine.inOut',
        repeat: -1,
        yoyo: true,
        delay: i * 0.3,
      });
    });
  }, { scope: scopeRef });
}
