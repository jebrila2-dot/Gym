/* Inline SVG icon set — constant strings only (safe for innerHTML). 24px grid, 1.8 stroke. */
'use strict';

const Icons = (() => {
  const w = (paths, extra) =>
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"${extra || ''}>${paths}</svg>`;

  return {
    home: w('<path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z"/>'),
    barbell: w('<path d="M7.5 8v8M4.5 9.5v5M16.5 8v8M19.5 9.5v5M7.5 12h9M2.5 12h2M19.5 12h2"/>'),
    run: w('<circle cx="14.5" cy="4.5" r="1.9"/><path d="M10.2 20.5l2-4.4-2.7-2.4 1.4-4.3 3.6-1 3 2.7 2.5.6M8.9 9.4l-3.4 1.2M13.5 13.9l1.5 2.6 3.5 1.2M5 16.5l3.2-.4 1-2.2"/>'),
    calendar: w('<rect x="4" y="5" width="16" height="16" rx="2.5"/><path d="M4 10h16M8.5 3v4M15.5 3v4M8 14h2.5M13.5 14H16M8 17.5h2.5"/>'),
    chart: w('<path d="M4 20h16M7 16v-4M12 16V7M17 16v-6"/>'),
    gear: w('<circle cx="12" cy="12" r="3.2"/><path d="M12 3.5v2.2M12 18.3v2.2M20.5 12h-2.2M5.7 12H3.5M18 6l-1.6 1.6M7.6 16.4 6 18M18 18l-1.6-1.6M7.6 7.6 6 6"/>'),
    plus: w('<path d="M12 5v14M5 12h14"/>'),
    check: w('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
    x: w('<path d="M6 6l12 12M18 6L6 18"/>'),
    chevR: w('<path d="M9 5.5l7 6.5-7 6.5"/>'),
    chevD: w('<path d="M5.5 9l6.5 7 6.5-7"/>'),
    timer: w('<circle cx="12" cy="13.5" r="7"/><path d="M12 13.5V9.8M9.5 3h5M12 3v3.5"/>'),
    pencil: w('<path d="M4 20l.9-3.9L16.6 4.4a1.9 1.9 0 0 1 2.7 0l.3.3a1.9 1.9 0 0 1 0 2.7L7.9 19.1z M14.5 6.5l3 3"/>'),
    trash: w('<path d="M5 7h14M10 7V5.5A1.5 1.5 0 0 1 11.5 4h1A1.5 1.5 0 0 1 14 5.5V7M7 7l.8 12a1.5 1.5 0 0 0 1.5 1.4h5.4a1.5 1.5 0 0 0 1.5-1.4L17 7M10.2 11v5.5M13.8 11v5.5"/>'),
    copy: w('<rect x="8.5" y="8.5" width="12" height="12" rx="2.5"/><path d="M15.5 5.5v-.2A2.3 2.3 0 0 0 13.2 3H5.8A2.3 2.3 0 0 0 3.5 5.3v7.4A2.3 2.3 0 0 0 5.8 15H6"/>'),
    table: w('<rect x="4" y="5" width="16" height="14" rx="2"/><path d="M4 10h16M4 14.5h16M10 10v9"/>'),
    flag: w('<path d="M6 21V4.5M6 4.5c2.5-1.6 5-1.6 7.5 0s5 1.6 6.5.6V13c-1.5 1-4 1-6.5-.6s-5-1.6-7.5 0"/>'),
    flame: w('<path d="M12 21c-3.6 0-6.2-2.4-6.2-5.8 0-2.5 1.6-4.4 3-6.1 1.1-1.4 2.2-2.7 2.6-4.6 2.6 1.5 6.8 5.7 6.8 10.7 0 3.4-2.6 5.8-6.2 5.8z"/><path d="M12 21c-1.7 0-2.9-1.2-2.9-2.9 0-1.6 1.3-2.7 2.9-4.1 1.6 1.4 2.9 2.5 2.9 4.1 0 1.7-1.2 2.9-2.9 2.9z"/>'),
    scale: w('<path d="M12 3v3M7.5 21h9M12 6a7.5 7.5 0 0 0-7.5 7.5h15A7.5 7.5 0 0 0 12 6zM12 6v3.5"/><path d="M12 13.5l2.6-2.6"/>'),
    search: w('<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.4-4.4"/>'),
    trophy: w('<path d="M8 4h8v5a4 4 0 0 1-8 0zM8 5.5H4.5V7A3.5 3.5 0 0 0 8 10.4M16 5.5h3.5V7A3.5 3.5 0 0 1 16 10.4M12 13v3.5M8.5 20.5h7M10 20.5v-2a2 2 0 0 1 4 0v2"/>'),
    heart: w('<path d="M12 20.5S4 15.5 4 9.8C4 7 6.2 5 8.6 5c1.5 0 2.7.7 3.4 1.9C12.7 5.7 14 5 15.4 5 17.8 5 20 7 20 9.8c0 5.7-8 10.7-8 10.7z"/>'),
    moon: w('<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z"/>'),
    sun: w('<circle cx="12" cy="12" r="4.2"/><path d="M12 3v2M12 19v2M21 12h-2M5 12H3M18.4 5.6 17 7M7 17l-1.4 1.4M18.4 18.4 17 17M7 7 5.6 5.6"/>'),
    download: w('<path d="M12 4v11M7.5 11.5 12 16l4.5-4.5M4.5 19.5h15"/>'),
    upload: w('<path d="M12 16V5M7.5 9 12 4.5 16.5 9M4.5 19.5h15"/>'),
    info: w('<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5M12 7.8v.4"/>'),
    swap: w('<path d="M7 4.5 3.5 8 7 11.5M3.5 8h13M17 12.5 20.5 16 17 19.5M20.5 16h-13"/>'),
    play: w('<path d="M7 4.8v14.4L19 12z"/>'),
    stop: w('<rect x="6" y="6" width="12" height="12" rx="2"/>'),
    up: w('<path d="M12 19V5M5.5 11.5 12 5l6.5 6.5"/>'),
    down: w('<path d="M12 5v14M5.5 12.5 12 19l6.5-6.5"/>'),
    dots: w('<circle cx="5.5" cy="12" r="1.1" fill="currentColor"/><circle cx="12" cy="12" r="1.1" fill="currentColor"/><circle cx="18.5" cy="12" r="1.1" fill="currentColor"/>'),
    note: w('<path d="M5 5.5A1.5 1.5 0 0 1 6.5 4h11A1.5 1.5 0 0 1 19 5.5v9L14.5 19h-8A1.5 1.5 0 0 1 5 17.5zM14.5 19v-4.5H19M8.5 9h7M8.5 12.5H12"/>'),
    zap: w('<path d="M13 3 5 13.5h5.5L11 21l8-10.5h-5.5z"/>'),
  };
})();
