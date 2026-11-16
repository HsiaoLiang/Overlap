import { ArrowDown, ArrowUpRight, Check, Link2, MousePointer2 } from "lucide-react";
import { CreateEventForm } from "@/components/create/create-event-form";
import { SharedMoment } from "@/components/home/shared-moment";
import { RecentEvents } from "@/components/recent-events";

export default function HomePage() {
  return (
    <main id="top" className="home-page">
      <section className="home-hero" aria-labelledby="home-title">
        <div className="home-hero-inner">
          <div className="home-intro">
            <p className="eyebrow hero-eyebrow"><span className="small-orbit" /> A LITTLE TIME. A LITTLE CLOSER.</p>
            <h1 id="home-title" className="home-title">Find your<br /><em>shared</em> moment<span className="title-period">.</span></h1>
            <p className="home-description">Different schedules. Different time zones.<br className="hidden sm:block" /> There&apos;s a little room for everyone.</p>
            <a href="#create-event" className="hero-cta">Bring your people together <ArrowUpRight size={19} aria-hidden="true" /></a>
            <p className="home-promise"><Check size={13} aria-hidden="true" /> Free. No accounts. Just a link.</p>
          </div>
          <SharedMoment />
        </div>
        <div className="hero-bottom-note"><span>LESS BACK-AND-FORTH. MORE BEING TOGETHER.</span><a href="#create-event">A moment starts here <ArrowDown size={13} aria-hidden="true" /></a></div>
      </section>

      <section id="create-event" className="home-create-section" aria-labelledby="create-title" tabIndex={-1}>
        <div className="home-create-copy">
          <p className="eyebrow">01 / MAKE SOME ROOM</p>
          <h2 id="create-title" className="section-display">Good things <br />start with <br /><em>“when?”</em></h2>
          <p className="section-description">Dinner with friends. A team across continents. That catch-up you keep putting off. Start with a time that works.</p>
        </div>
        <div className="home-create-card workspace-panel"><CreateEventForm /></div>
        <ol className="how-it-works">
            <li><span><Link2 size={17} aria-hidden="true" /></span><div><strong>One link for everyone.</strong><p>Pick a few days and send it around.</p></div></li>
            <li><span><MousePointer2 size={17} aria-hidden="true" /></span><div><strong>A little colour in the calendar.</strong><p>Everyone paints the times they&apos;re free.</p></div></li>
            <li><span><Check size={17} aria-hidden="true" /></span><div><strong>Your moment comes into view.</strong><p>Find the overlap. Make it a plan.</p></div></li>
        </ol>
        <div className="home-recent"><RecentEvents /></div>
      </section>
      <div className="home-closing" aria-hidden="true"><span>Less scheduling.</span><em>More living.</em><span className="closing-orbit" /></div>
    </main>
  );
}
