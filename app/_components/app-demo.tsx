export type AppDemoSource = {
  video: string;
  poster?: string;
  captions: string;
};

/** Enable when the app recording and captions are ready; no empty public slot. */
export function AppDemo({ source }: { source?: AppDemoSource }) {
  if (!source) return null;
  return (
    <section className="appDemo" aria-labelledby="app-demo-heading">
      <div className="sectionHeading sectionHeadingCentered">
        <h2 id="app-demo-heading">A little look around.</h2>
        <p className="detailIntro">See your everyday copilot at work.</p>
      </div>
      <video controls playsInline preload="none" poster={source.poster} aria-label="Local AI Cat app demo">
        <source src={source.video} type="video/mp4" />
        <track kind="captions" src={source.captions} srcLang="en" label="English" default />
        Your browser cannot play this video. <a href={source.video}>Download the demo.</a>
      </video>
    </section>
  );
}
