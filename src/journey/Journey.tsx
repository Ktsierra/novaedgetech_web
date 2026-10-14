import { CSSProperties, useEffect, useRef } from 'react';
import './Journey.css';
import { JourneyOptions, runJourney } from './engine';
import JourneyContact from './JourneyContact';
import { CONTACT_EMAIL, GO, services, work } from './journeyText';

/** CSS custom properties for the reveal classes */
const v = (vars: Record<string, string>) => vars as CSSProperties;

const Corner = ({ pos }: { pos: 'tl' | 'tr' | 'bl' | 'br' }) => (
  <div data-at="0.475" className={'j-fade j-corner j-corner--' + pos} />
);

const Journey = (props: JourneyOptions) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const { skipIntro, galaxyDensity, armCount, journeyLength } = props;

  useEffect(() => {
    if (!rootRef.current) return;
    return runJourney(rootRef.current, { skipIntro, galaxyDensity, armCount, journeyLength });
  }, [skipIntro, galaxyDensity, armCount, journeyLength]);

  return (
    <div ref={rootRef} className="journey">
      <canvas data-gal className="j-canvas" />
      <div data-clouds className="j-clouds" />
      <div data-iris className="j-iris" />
      <div data-cur2 className="j-cur2" />
      <div data-cur1 className="j-cur1" />

      {/* ---------- loader ---------- */}
      <div data-loader className="j-loader">
        <div className="j-row">
          <div className="j-logo">NOVAEDGE</div>
          <div className="j-loader-tag">BOOT SEQUENCE // V2.1</div>
        </div>
        <div className="j-row j-row--end">
          <div data-status0 className="j-loader-status">&gt; initializing particle field_</div>
          <div data-count className="j-count">000</div>
        </div>
      </div>

      {/* ---------- nav ---------- */}
      <nav data-nav className="j-nav">
        <a href="#top" data-go={GO.top} data-hov className="j-logo">NOVAEDGE<span className="j-cyan">.</span></a>
        <div className="j-nav-links">
          <a href="#services" data-go={GO.services} data-hov>SERVICES</a>
          <a href="#work" data-go={GO.work} data-hov>WORK</a>
          <a href="#contact" data-go={GO.contact} data-hov>CONTACT</a>
        </div>
        <a href="#contact" data-go={GO.contact} data-hov className="j-btn j-btn--ghost-cyan">START A PROJECT</a>
      </nav>

      {/* ---------- HUD ---------- */}
      <div data-hud className="j-hud" aria-hidden="true">
        <div className="j-hud-status"><span className="j-dot" /><span data-hudstatus /></div>
        <div className="j-hud-right">
          <div data-hudscale className="j-hud-scale" />
          <div className="j-hud-track"><div data-hudbar className="j-hud-bar" /></div>
        </div>
      </div>

      {/* ---------- hero: galaxy ---------- */}
      <section data-stage="hero" className="j-hero" aria-label="Intro">
        <div data-hero className="j-rise j-eyebrow j-hero-eyebrow">NOVAEDGE TECH CORP ✦ WEB &amp; MOBILE ENGINEERING</div>
        <h1 className="j-hero-title">
          <div data-hline><span data-hero data-scr className="j-rise j-block" style={v({ '--rise': '60px', '--dur': '.9s' })}>WE BUILD</span></div>
          <div data-hline><span data-hero data-scr className="j-rise j-block j-outline" style={v({ '--rise': '60px', '--dur': '.9s' })}>WHAT&apos;S</span></div>
          <div data-hline><span data-hero className="j-rise j-block" style={v({ '--rise': '60px', '--dur': '.9s' })}><span data-scr>NEXT</span><span className="j-cyan">.</span></span></div>
        </h1>
        <div className="j-hero-foot">
          <p data-hero className="j-rise j-hero-copy" style={v({ '--dur': '.9s', '--delay': '.1s' })}>
            Web apps. Mobile apps. Engineered for startups that move fast, from first commit to orbit. Scroll: we&apos;ll take you from the galaxy to your desk.
          </p>
          <div data-hero className="j-rise j-hero-ctas" style={v({ '--dur': '.9s', '--delay': '.2s' })}>
            <a href="#contact" data-go={GO.contact} data-hov className="j-btn j-btn--solid">START A PROJECT ↗</a>
            <a href="#journey" data-go={GO.journey} data-hov className="j-btn j-btn--ghost">TAKE THE JOURNEY ↓</a>
          </div>
        </div>
        <div data-hero data-cue className="j-fade j-cue" style={v({ '--dur': '1.2s', '--delay': '.5s' })}>
          <span>SCROLL TO TRAVEL</span>
          <span className="j-cue-line" />
        </div>
      </section>

      {/* ---------- low orbit: services ---------- */}
      <section id="services" data-stage="planet" className="j-stage j-planet-stage" aria-label="Services">
        <div data-pwrap className="j-pwrap">
          <div className="j-planet-glow" />
          <div className="j-planet">
            <div className="j-planet-land" />
            <div className="j-planet-lights" />
            <div className="j-planet-shade" />
            <div className="j-planet-rim" />
          </div>
          <canvas data-earth className="j-earth" aria-hidden="true" />
          <div data-at="0.475" className="j-fade j-planet-ringwrap"><div className="j-planet-ring" /></div>
          <Corner pos="tl" /><Corner pos="tr" /><Corner pos="bl" /><Corner pos="br" />
          <div data-at="0.475" className="j-fade j-planet-tag"><div>EARTH // CLIENT ORBIT</div></div>
        </div>
        <div className="j-services">
          <div data-at="0.465" data-scr className="j-fade j-eyebrow">01 / SERVICES · LOW ORBIT</div>
          <h2 data-at="0.48" className="j-rise j-h2 j-services-title">Full-stack,<br />full-orbit.</h2>
          <div className="j-service-list">
            {services.map(s => (
              <div key={s.num} data-at={s.at} className="j-rise j-service" style={v({ '--rise': '26px', '--dur': '.7s' })}>
                <div className="j-service-num">{s.num}</div>
                <div>
                  <div className="j-service-title">{s.title}</div>
                  <div className="j-service-body">{s.body}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- surface: work ---------- */}
      <section id="work" data-stage="surface" className="j-stage j-surface" aria-label="Selected work">
        <div className="j-sky" />
        <div className="j-moon" />
        <div className="j-ridge j-ridge--far" />
        <div className="j-ridge j-ridge--near" />
        <div className="j-outpost" />
        <div className="j-mast" style={{ left: '23%', top: '44.5%', height: '9%' }}><span style={{ animationDuration: '1.6s' }} /></div>
        <div className="j-mast" style={{ left: '76%', top: '46.5%', height: '7%' }}><span style={{ animationDuration: '2.1s' }} /></div>
        <div className="j-horizon" />
        <div className="j-haze" />
        <div className="j-grid" />
        <div className="j-surface-content">
          <div className="j-surface-head">
            <div data-at="0.655" data-scr className="j-fade j-eyebrow">02 / SELECTED WORK · SURFACE LEVEL</div>
            <h2 data-at="0.67" className="j-rise j-h2 j-surface-title">Touchdown: the work.</h2>
            <div data-at="0.685" className="j-fade j-coords">LAT 12.7° ✦ LON −48.2° ✦ OUTPOST 04 · EARTH</div>
          </div>
          <div className="j-work-grid">
            {work.map(w => (
              <div key={w.id} data-at={w.at} className="j-rise j-work-item" style={v({ '--rise': '46px', '--offset': `${String(w.offset)}px` })}>
                <div className="j-wcard" style={v({ '--tilt': w.tilt })}>
                  <div className="j-wcard-shot">
                    {w.image
                      ? <img src={w.image} alt={`${w.title} screenshot`} loading="lazy" />
                      : <div className="j-wcard-placeholder" aria-hidden="true"><span>{w.title}</span></div>}
                  </div>
                  <div className="j-wcard-meta">
                    <span className="j-wcard-title">{w.title}</span>
                    <span className="j-wcard-tags">{w.meta}</span>
                  </div>
                  <div className="j-scanlines" />
                </div>
                <div className="j-beam" />
                <div className="j-beam-glow" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- your desk: contact ---------- */}
      <section id="contact" data-stage="desk" className="j-stage j-desk" aria-label="Contact">
        <div className="j-desk-glow" />
        <div className="j-desk-col">
          <div data-at="0.90" data-scr className="j-fade j-eyebrow j-desk-eyebrow">03 / CONTACT · SEA LEVEL, YOUR DESK</div>
          <h2 data-at="0.91" className="j-rise j-h2 j-desk-title" style={v({ '--rise': '26px' })}>Every universe ends<br />at a keyboard.</h2>
          <div data-at="0.918" className="j-rise j-laptop" style={v({ '--rise': '34px', '--dur': '.9s' })}>
            <div className="j-screen">
              <div className="j-titlebar">
                <span className="j-light" style={{ background: '#FF5F57' }} />
                <span className="j-light" style={{ background: '#FEBC2E' }} />
                <span className="j-light" style={{ background: '#28C840' }} />
                <span className="j-titlebar-name">novaedge · start a project</span>
              </div>
              <div className="j-screen-body">
                <pre data-code className="j-code" />
                <JourneyContact />
              </div>
            </div>
            <div className="j-laptop-base" />
          </div>
          <a data-at="0.962" href={`mailto:${CONTACT_EMAIL}`} className="j-fade j-mail" style={v({ '--dur': '.9s' })}>{CONTACT_EMAIL}</a>
          <div data-at="0.972" className="j-fade j-footer" style={v({ '--dur': '1s' })}>
            <span>© {new Date().getFullYear()} NOVAEDGE TECH CORP</span>
            <span>NOVAEDGETECHNOLOGY.COM</span>
            <span>REACT ✦ THREE.JS ✦ STARDUST</span>
          </div>
        </div>
      </section>

      <main className="j-main"><div data-track className="j-track" /></main>
    </div>
  );
};

export default Journey;
