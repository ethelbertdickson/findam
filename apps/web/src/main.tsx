import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const playStoreUrl = import.meta.env.VITE_PLAY_STORE_URL || '#download';
const appStoreUrl = import.meta.env.VITE_APP_STORE_URL || '#download';

function DownloadButtons() {
  return <div className="download-buttons"><a className="store-button" href={playStoreUrl}><span className="store-mark">▶</span><span><small>GET IT ON</small><strong>Google Play</strong></span></a><a className="store-button" href={appStoreUrl}><span className="store-mark">●</span><span><small>Download on the</small><strong>App Store</strong></span></a></div>;
}

function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  return <div className="site-shell">
    <header className="navbar"><a className="brand" href="#top"><span className="brand-icon">F</span><span>find<span>am</span></span></a><button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">☰</button><nav className={menuOpen ? 'nav-links open' : 'nav-links'}><a href="#features">Features</a><a href="#how-it-works">How it works</a><a href="#download">Download</a><a className="nav-cta" href="#download">Get the app <span>↗</span></a></nav></header>
    <main id="top">
      <section className="hero"><div className="hero-copy"><p className="eyebrow"><span className="eyebrow-dot" /> FIND WHAT MATTERS</p><h1>Your next find is<br /><em>closer than you think.</em></h1><p className="hero-text">Findam brings the places, products, and people you are looking for into one simple experience built for everyday life.</p><DownloadButtons /><p className="availability">Available soon on iOS and Android</p></div><div className="hero-visual"><div className="glow" /><div className="phone"><div className="phone-notch" /><div className="phone-screen"><div className="screen-top"><b>Findam</b><span>⌕</span></div><p className="screen-greeting">Good morning, Dikson</p><div className="search-pill">⌕ <span>What are you looking for?</span></div><div className="screen-label">Explore nearby</div><div className="listing-photo photo-one"><span>For sale</span></div><div className="listing-photo photo-two"><span>New finds</span></div><div className="bottom-tabs"><b>⌂</b><span>♡</span><span>＋</span><span>◉</span></div></div></div><div className="float-card card-one">⌖ <span>Find nearby</span></div><div className="float-card card-two">✦ <span>Something for you</span></div></div></section>
      <section className="trust-row"><span>BUILT FOR REAL LIFE</span><span>Discover locally</span><span>Save what matters</span><span>Share with ease</span></section>
      <section className="section" id="features"><div className="section-heading"><p className="eyebrow">ONE PLACE. MORE POSSIBILITIES.</p><h2>Everything you need<br />to find your next thing.</h2></div><div className="feature-grid"><article><div className="feature-icon blue">⌕</div><h3>Discover with clarity</h3><p>Search through useful, local results without the noise. Find homes, land, products, and services that fit your life.</p></article><article><div className="feature-icon purple">♡</div><h3>Keep what matters</h3><p>Save your favourites, build a shortlist, and return to the things you want when the time is right.</p></article><article><div className="feature-icon orange">↗</div><h3>Share the find</h3><p>Send a listing or idea to friends and family. Better decisions are easier when everyone is in the loop.</p></article></div></section>
      <section className="split-section" id="how-it-works"><div className="split-art"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="compass">✦</div><div className="art-label label-a">Search</div><div className="art-label label-b">Save</div><div className="art-label label-c">Share</div></div><div className="split-copy"><p className="eyebrow">A BETTER WAY TO LOOK AROUND</p><h2>From “just looking” to <em>found.</em></h2><p>Findam makes the journey feel natural. Start with a simple search, explore the possibilities, and take the next step when something feels right.</p><div className="steps"><div><b>01</b><span><strong>Search your way</strong><small>Use simple words and useful filters.</small></span></div><div><b>02</b><span><strong>Make it yours</strong><small>Save, compare, and organise your finds.</small></span></div><div><b>03</b><span><strong>Move forward</strong><small>Connect, share, and make it happen.</small></span></div></div></div></section>
      <section className="download-section" id="download"><div><p className="eyebrow">READY WHEN YOU ARE</p><h2>Find what matters<br /><em>with Findam.</em></h2><p>Download the app and start exploring your world.</p></div><DownloadButtons /></section>
    </main><footer><a className="brand" href="#top"><span className="brand-icon">F</span><span>find<span>am</span></span></a><span>© 2026 Findam. Find what matters.</span><div><a href="#features">Features</a><a href="#download">Download</a></div></footer>
  </div>;
}

createRoot(document.getElementById('root')!).render(<App />);
