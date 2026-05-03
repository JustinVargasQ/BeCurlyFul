/**
 * Decorative floating SVG shapes for the hero section.
 * Positioned absolutely; animated via GSAP through `.gsap-float` and `[data-parallax]`.
 * Pure decoration — pointer-events: none, behind interactive content.
 */
export default function HeroDecorations() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden z-0">
      {/* Soft rose blob — top right, parallaxes slowly */}
      <div
        data-parallax="0.25"
        className="gsap-float absolute -top-10 right-[6%] w-40 h-40 sm:w-56 sm:h-56"
        style={{ filter: 'blur(0.5px)' }}>
        <svg viewBox="0 0 200 200" className="w-full h-full opacity-50">
          <defs>
            <radialGradient id="hd-blob1" cx="50%" cy="50%">
              <stop offset="0%"  stopColor="#FBC8D5" stopOpacity="0.95" />
              <stop offset="60%" stopColor="#EDB7C1" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#EDB7C1" stopOpacity="0" />
            </radialGradient>
          </defs>
          <path fill="url(#hd-blob1)" d="M40,-58.4C50.8,-49,57.5,-35.6,62.5,-21.4C67.5,-7.3,70.8,7.6,67.7,21.4C64.5,35.2,54.9,47.9,42.5,55.8C30.1,63.7,15,66.7,-0.5,67.4C-16,68.1,-32,66.5,-43.7,58.5C-55.5,50.5,-63,36.1,-67.7,20.7C-72.4,5.3,-74.4,-11,-69.4,-24.6C-64.4,-38.2,-52.4,-49,-39.3,-58.2C-26.2,-67.4,-13.1,-75,1.4,-77C15.9,-79,29.2,-67.8,40,-58.4Z" transform="translate(100 100)"/>
        </svg>
      </div>

      {/* Gold accent ring — middle left, slow float */}
      <div
        data-parallax="0.18"
        className="gsap-float absolute top-[35%] -left-8 w-32 h-32 sm:w-44 sm:h-44 opacity-40">
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <circle cx="50" cy="50" r="44" fill="none" stroke="#C9A875" strokeWidth="0.6" strokeDasharray="2 4" />
          <circle cx="50" cy="50" r="32" fill="none" stroke="#C9A875" strokeWidth="0.4" strokeDasharray="1 3" />
        </svg>
      </div>

      {/* Tiny rotating star — bottom right */}
      <div
        data-parallax="0.35"
        className="gsap-float absolute bottom-[18%] right-[18%] w-10 h-10 opacity-60">
        <svg viewBox="0 0 24 24" className="w-full h-full">
          <path
            d="M12 2 L13.6 9.4 L21 11 L13.6 12.6 L12 20 L10.4 12.6 L3 11 L10.4 9.4 Z"
            fill="#C9A875" opacity="0.7"
          />
        </svg>
      </div>

      {/* Diamond accent — top center, mid parallax */}
      <div
        data-parallax="0.12"
        className="gsap-float absolute top-[12%] left-[42%] w-6 h-6 opacity-50">
        <svg viewBox="0 0 24 24" className="w-full h-full">
          <path d="M12 2 L22 12 L12 22 L2 12 Z" fill="none" stroke="#B85F72" strokeWidth="1.2" />
        </svg>
      </div>
    </div>
  );
}
