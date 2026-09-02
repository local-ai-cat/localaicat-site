import { publishedChannels, channelSnapshot } from "../../../lib/channel-snapshot";
import styles from "./channel-strip.module.css";

const blurbs: Record<string, string> = {
  outdoor: "Direct Download · Sparkle stable · what everyone gets",
  beta: "Sparkle beta channel · opted-in testers",
  alpha: "Daily agent / dev channel"
};

function formatCount(value: number): string {
  return value.toLocaleString("en-US");
}

// What each update channel is serving RIGHT NOW, from the published snapshot.
// The table below reads the manifest at trunk head, which is what a build cut
// today would contain; these three cards are what people can actually install.
export function ChannelStrip() {
  const channels = publishedChannels();
  const { synced, trunk } = channelSnapshot;

  return (
    <section aria-label="Published builds" className={styles.strip}>
      <div className={styles.heading}>
        <p>Published builds</p>
        <span>
          What each update channel is serving today. Synced from the live update feed on{" "}
          <time dateTime={synced}>{synced}</time>, measured against trunk <code>{trunk.commit}</code> ({trunk.date}).
        </span>
      </div>
      <div className={styles.cards}>
        {channels.map((channel) => {
          const behind = channel.trunkCommitsSince;
          return (
            <article className={styles.card} data-channel={channel.key} key={channel.key}>
              <p className={styles.label}>{channel.label}</p>
              <p className={styles.version}>
                {channel.version}
                <span className={styles.build}>build {channel.build}</span>
              </p>
              <dl className={styles.facts}>
                <div>
                  <dt>Cut</dt>
                  <dd><time dateTime={channel.commitDate}>{channel.commitDate}</time></dd>
                </div>
                <div>
                  <dt>Features on board</dt>
                  <dd>
                    {channel.manifest.shippingCount} of {channel.manifest.featureCount}
                  </dd>
                </div>
                <div>
                  <dt>Behind trunk</dt>
                  <dd>{behind === 0 ? "up to date" : `${formatCount(behind)} commit${behind === 1 ? "" : "s"}`}</dd>
                </div>
              </dl>
              <p className={styles.blurb} title={`${channel.tag} · ${channel.commit}`}>{blurbs[channel.key]}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
