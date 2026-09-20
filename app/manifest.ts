import type { MetadataRoute } from "next";
import { basePath } from "@/lib/base-path";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "DataFill – Free Lorem Ipsum Generator, Word Counter & Fake Data Tools",
    short_name: "DataFill",
    description:
      "Free online text toolkit: lorem ipsum generator, character and word counter, case converter, password generator, and fake name, email, address and phone data.",
    start_url: `${basePath}/`,
    scope: `${basePath}/`,
    display: "standalone",
    background_color: "#202329",
    theme_color: "#202329",
    lang: "en",
    dir: "ltr",
    icons: [
      {
        src: `${basePath}/icon.svg`,
        sizes: "any",
        type: "image/svg+xml",
      },
      {
        src: `${basePath}/apple-icon.png`,
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
