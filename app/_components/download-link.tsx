"use client";

import type { AnchorHTMLAttributes } from "react";
import { trackSiteAction, type DownloadChannel } from "../../lib/site-analytics";

type DownloadLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "onClick"> & {
  channel: DownloadChannel;
};

export function DownloadLink({ channel, ...props }: DownloadLinkProps) {
  return <a {...props} onClick={() => trackSiteAction("download_clicked", channel)} />;
}
