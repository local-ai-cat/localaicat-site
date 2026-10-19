# Homepage app demo

The optional `AppDemo` component sits between downloads and pricing in `HomeExperience`. No empty player or placeholder is published.

When the recording is ready, pass a `demo` prop from `app/page.tsx` with project-hosted assets:

```tsx
<HomeExperience demo={{
  video: "/assets/app-demo.mp4",
  poster: "/assets/app-demo-poster.webp",
  captions: "/assets/app-demo.en.vtt"
}} />
```

Supply an edited screen recording, a still poster and accurate English captions. Use consented or fictional chat content, with no keys, private messages or account details visible. The player has controls and does not autoplay or preload video. Check the finished recording at mobile and desktop sizes before enabling it.
