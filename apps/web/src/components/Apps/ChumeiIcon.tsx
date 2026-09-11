/**
 * 竹梅活動觀測站's own logo mark, served from our origin.
 *
 * Every other entry in the app list is a lucide glyph tinted by the theme; this
 * one is a third party's brand, so it keeps its own artwork and colours and is
 * clipped to the same rounded square the glyph tiles use. Copied into
 * `public/images` rather than hotlinked, so the list does not depend on
 * chumei.observe.tw being up to render.
 */
const ChumeiIcon = ({ size = 24 }: { size?: number }) => (
  <img
    src="/images/chumei-logo.png"
    alt=""
    width={size}
    height={size}
    loading="lazy"
    decoding="async"
    className="rounded-[4px]"
  />
);

export default ChumeiIcon;
