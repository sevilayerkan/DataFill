import { ImageResponse } from "next/og";

export const alt =
  "DataFill – Free Lorem Ipsum Generator, Word Counter & Fake Data Tools";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          backgroundColor: "#202329",
          color: "#FAFAF9",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "20px",
            marginBottom: "24px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "72px",
              height: "72px",
              borderRadius: "16px",
              backgroundColor: "#FAFAF9",
              color: "#202329",
              fontSize: "40px",
              fontWeight: 800,
            }}
          >
            D
          </div>
          <div style={{ fontSize: "40px", fontWeight: 700 }}>DataFill</div>
        </div>
        <div
          style={{
            fontSize: "64px",
            fontWeight: 800,
            lineHeight: 1.1,
            maxWidth: "960px",
          }}
        >
          Free Lorem Ipsum, Word Counter &amp; Fake Data Tools
        </div>
        <div style={{ fontSize: "28px", opacity: 0.8, marginTop: "24px" }}>
          No sign-up · English &amp; Turkish · Runs in your browser
        </div>
      </div>
    ),
    { ...size }
  );
}
