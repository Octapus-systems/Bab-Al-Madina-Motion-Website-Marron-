// Animated line icons for the content sections (Why Choose cards, the Laid → Packed →
// Delivered timeline, Our Commitment). Stroke uses currentColor, so callers colour them
// with a text-* class exactly like the lucide icons they replace. All motion is CSS
// (ANIM_ICON_CSS, rendered once by the page) and stops under prefers-reduced-motion.

type IconProps = { className?: string };

const svgProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

/** Hen that pecks. */
export const AnimHen = ({ className }: IconProps) => (
  <svg {...svgProps} className={`ai ai-hen ${className ?? ""}`}>
    <g className="ai-hen-body">
      <path d="M4.5 13.5c0 3.3 2.9 5.5 6.5 5.5s6.5-2.2 6.5-5.5c0-1.4-.5-2.6-1.3-3.6" />
      <path d="M4.5 13.5C3.5 11.7 3.4 9.6 4.4 8c.8 1.5 2.3 2.3 4 2.4 1-.6 2-.9 3-.9" />
      <path d="M8.3 13.4c1.5 1.8 4 2 5.8.6" />
    </g>
    <path d="M10 19v2.2M9 21.2h2M13 19v2.2M12 21.2h2" />
    <g className="ai-hen-head">
      <path d="M15.4 8.9l.8 1" />
      <circle cx="16.8" cy="7.2" r="2" />
      <path d="M15.6 5.4c-.2-.9.4-1.6 1.1-1.4.2-.7 1.2-.8 1.5-.1.7-.1 1.1.7.7 1.3" />
      <path d="M18.7 6.9l1.7.5-1.7.6" />
      <path d="M18.3 8.4c.2.7-.1 1.2-.6 1.2" />
      <circle cx="17.3" cy="6.8" r=".35" fill="currentColor" stroke="none" />
    </g>
  </svg>
);

/** Box: an egg drops in, the flaps close, tape goes across. */
export const AnimBox = ({ className }: IconProps) => (
  <svg {...svgProps} className={`ai ai-box ${className ?? ""}`}>
    <ellipse className="ai-box-egg" cx="12" cy="4.6" rx="1.6" ry="2" />
    {/* back rim of the open top, then the front face drawn over it */}
    <path d="M6.5 8h11L20 11H4z" />
    <path d="M4 11h16v9H4z" />
    <path d="M9 14.2h6v2.6H9z" />
    <path className="ai-box-flap-l" d="M4 11 6.5 8" />
    <path className="ai-box-flap-r" d="M20 11 17.5 8" />
    <path className="ai-box-tape" d="M12 8v3" />
  </svg>
);

/** Truck driving: body bounce, spinning wheels, passing speed lines. */
export const AnimTruck = ({ className }: IconProps) => (
  <svg {...svgProps} className={`ai ai-truck ${className ?? ""}`}>
    <g className="ai-truck-speed">
      <path d="M1 9.5h2.2M.5 12.5h3M1.2 15.5h1.8" />
    </g>
    <g className="ai-truck-body">
      <path d="M4.5 7h10v9.5h-10z" />
      <path d="M14.5 10h3.6l2.9 3.1v3.4h-6.5" />
      <path d="M16 11.2h1.7l1.5 1.6H16z" />
    </g>
    <g className="ai-truck-wheel" style={{ transformOrigin: "8px 17.5px" }}>
      <circle cx="8" cy="17.5" r="1.9" fill="none" />
      <path d="M8 16.1v2.8" />
    </g>
    <g className="ai-truck-wheel" style={{ transformOrigin: "17.5px 17.5px" }}>
      <circle cx="17.5" cy="17.5" r="1.9" fill="none" />
      <path d="M17.5 16.1v2.8" />
    </g>
  </svg>
);

/** Shield whose check mark keeps drawing itself. */
export const AnimShield = ({ className }: IconProps) => (
  <svg {...svgProps} className={`ai ai-shield ${className ?? ""}`}>
    <path d="M12 3 5 6v5c0 4.5 3 8.3 7 9.5 4-1.2 7-5 7-9.5V6z" />
    <path className="ai-shield-check" d="M8.8 12.2l2.2 2.2 4.4-4.6" pathLength={1} />
  </svg>
);

/** Medal that swings with a twinkling star. */
export const AnimMedal = ({ className }: IconProps) => (
  <svg {...svgProps} className={`ai ai-medal ${className ?? ""}`}>
    <g className="ai-medal-swing">
      <path d="M9.3 13.6 7.8 21l4.2-2.4 4.2 2.4-1.5-7.4" />
      <circle cx="12" cy="9" r="5.5" />
      <path
        className="ai-medal-star"
        d="m12 6.4.8 1.7 1.8.2-1.3 1.2.3 1.8-1.6-.9-1.6.9.3-1.8-1.3-1.2 1.8-.2z"
        fill="currentColor"
        stroke="none"
      />
    </g>
  </svg>
);

/** Clock with sweeping hands. */
export const AnimClock = ({ className }: IconProps) => (
  <svg {...svgProps} className={`ai ai-clock ${className ?? ""}`}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 4.6v1M19.4 12h-1M12 19.4v-1M4.6 12h1" />
    <path className="ai-clock-hour" d="M12 12V8.6" />
    <path className="ai-clock-min" d="M12 12h4.6" />
    <circle cx="12" cy="12" r=".7" fill="currentColor" stroke="none" />
  </svg>
);

/** Map pin that bounces over a ripple. */
export const AnimPin = ({ className }: IconProps) => (
  <svg {...svgProps} className={`ai ai-pin ${className ?? ""}`}>
    <ellipse className="ai-pin-ripple" cx="12" cy="21.3" rx="3.2" ry=".9" />
    <g className="ai-pin-drop">
      <path d="M12 19.6s-6-5.2-6-10a6 6 0 1 1 12 0c0 4.8-6 10-6 10z" />
      <circle cx="12" cy="9.6" r="2.2" />
    </g>
  </svg>
);

export const ANIM_ICON_CSS = `
.ai * { transform-box: fill-box; }
.ai-hen-head { transform-origin: 20% 90%; animation: aiPeck 2.6s ease-in-out infinite; }
.ai-hen-body { transform-origin: 50% 100%; animation: aiBreathe 2.6s ease-in-out infinite; }
@keyframes aiPeck { 0%, 55%, 100% { transform: rotate(0); } 62% { transform: rotate(24deg) translateY(.6px); } 68% { transform: rotate(4deg); } 74% { transform: rotate(22deg) translateY(.6px); } 82% { transform: rotate(0); } }
@keyframes aiBreathe { 0%, 100% { transform: scaleY(1); } 50% { transform: scaleY(1.035); } }

.ai-box-egg { transform-origin: 50% 50%; animation: aiEggDrop 3.4s cubic-bezier(.5,0,.75,0) infinite; }
.ai-box-flap-l { transform-origin: 0% 100%; animation: aiFlapL 3.4s ease-in-out infinite; }
.ai-box-flap-r { transform-origin: 100% 100%; animation: aiFlapR 3.4s ease-in-out infinite; }
.ai-box-tape { stroke-dasharray: 3; animation: aiTape 3.4s ease-out infinite; }
@keyframes aiEggDrop { 0% { transform: translateY(-2px); opacity: 0; } 10% { opacity: 1; } 32% { transform: translateY(5.5px); opacity: 1; } 38%, 100% { transform: translateY(5.5px); opacity: 0; } }
@keyframes aiFlapL { 0%, 34% { transform: rotate(-70deg); } 50%, 90% { transform: rotate(0); } 100% { transform: rotate(-70deg); } }
@keyframes aiFlapR { 0%, 34% { transform: rotate(70deg); } 50%, 90% { transform: rotate(0); } 100% { transform: rotate(70deg); } }
@keyframes aiTape { 0%, 52% { stroke-dashoffset: 3; opacity: 0; } 53% { opacity: 1; } 64%, 88% { stroke-dashoffset: 0; opacity: 1; } 96%, 100% { stroke-dashoffset: 0; opacity: 0; } }

.ai-truck-body { animation: aiBounce .5s ease-in-out infinite alternate; }
.ai-truck-wheel { transform-box: view-box; animation: aiSpin .6s linear infinite; }
.ai-truck-speed { animation: aiSpeed .9s linear infinite; }
@keyframes aiBounce { from { transform: translateY(0); } to { transform: translateY(-.5px); } }
@keyframes aiSpin { to { transform: rotate(360deg); } }
@keyframes aiSpeed { 0% { transform: translateX(3px); opacity: 0; } 30% { opacity: 1; } 100% { transform: translateX(-3px); opacity: 0; } }

.ai-shield-check { stroke-dasharray: 1; animation: aiCheck 2.8s ease-out infinite; }
@keyframes aiCheck { 0%, 12% { stroke-dashoffset: 1; } 40%, 85% { stroke-dashoffset: 0; } 100% { stroke-dashoffset: 1; } }

.ai-medal-swing { transform-origin: 50% 0%; animation: aiSwing 3s ease-in-out infinite; }
.ai-medal-star { transform-origin: 50% 50%; animation: aiTwinkle 3s ease-in-out infinite; }
@keyframes aiSwing { 0%, 100% { transform: rotate(-6deg); } 50% { transform: rotate(6deg); } }
@keyframes aiTwinkle { 0%, 40%, 100% { transform: scale(1); } 50% { transform: scale(1.35) rotate(20deg); } 60% { transform: scale(1); } }

.ai-clock-hour, .ai-clock-min { transform-box: view-box; transform-origin: 12px 12px; }
.ai-clock-min { animation: aiSpin 4s linear infinite; }
.ai-clock-hour { animation: aiSpin 48s linear infinite; }

.ai-pin-drop { animation: aiPinBounce 1.8s cubic-bezier(.3,0,.4,1) infinite; }
.ai-pin-ripple { transform-origin: 50% 50%; animation: aiRipple 1.8s ease-out infinite; }
@keyframes aiPinBounce { 0%, 100% { transform: translateY(0); } 40% { transform: translateY(-2.2px); } 60% { transform: translateY(0); } 70% { transform: translateY(-.5px); } }
@keyframes aiRipple { 0%, 55% { transform: scale(.4); opacity: 0; } 62% { opacity: .9; } 100% { transform: scale(1.5); opacity: 0; } }

@media (prefers-reduced-motion: reduce) {
  .ai * { animation: none !important; }
  .ai-box-egg { opacity: 0; }
}
`;
