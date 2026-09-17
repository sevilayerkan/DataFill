import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FadelyText – Free Lorem Ipsum Generator, Word Counter & Fake Data Tools",
    short_name: "FadelyText",
    description:
      "Free online text toolkit: lorem ipsum generator, character and word counter, case converter, password generator, and fake name, email, address and phone data.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#202329",
    theme_color: "#202329",
    lang: "en",
    dir: "ltr",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
      {
        src: "/apple-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
