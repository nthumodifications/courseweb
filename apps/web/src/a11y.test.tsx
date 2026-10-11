import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "bun:test";
import ChumeiIcon from "./components/Apps/ChumeiIcon";
import FullLogo from "./components/Branding/FullLogo";
import NTHUModsLogo from "./components/Branding/NTHUModsLogo";
import NTHUBirdIcon from "./components/NTHUBirdIcon";
import { GreenLineIcon } from "./components/BusIcons/GreenLineIcon";
import { NandaLineIcon } from "./components/BusIcons/NandaLineIcon";
import { RedLineIcon } from "./components/BusIcons/RedLineIcon";
import { Route1LineIcon } from "./components/BusIcons/Route1LineIcon";
import { Route2LineIcon } from "./components/BusIcons/Route2LineIcon";
import TLDLineIcon from "./components/BusIcons/TLDLineIcon";
import en from "./dictionaries/en.json";
import zh from "./dictionaries/zh.json";

test("representative accessibility contracts render into the markup", () => {
  const markup = renderToStaticMarkup(
    <>
      <ChumeiIcon />
      <FullLogo />
      <NTHUModsLogo />
      <NTHUBirdIcon />
      <GreenLineIcon />
      <NandaLineIcon />
      <RedLineIcon />
      <Route1LineIcon />
      <Route2LineIcon />
      <TLDLineIcon />
    </>,
  );

  expect(renderToStaticMarkup(<ChumeiIcon />)).toContain('alt=""');
  for (const svgMarkup of [
    renderToStaticMarkup(<FullLogo />),
    renderToStaticMarkup(<NTHUModsLogo />),
    renderToStaticMarkup(<NTHUBirdIcon />),
    renderToStaticMarkup(<GreenLineIcon />),
    renderToStaticMarkup(<NandaLineIcon />),
    renderToStaticMarkup(<RedLineIcon />),
    renderToStaticMarkup(<Route1LineIcon />),
    renderToStaticMarkup(<Route2LineIcon />),
    renderToStaticMarkup(<TLDLineIcon />),
  ]) {
    expect(svgMarkup).toContain('aria-hidden="true"');
  }
});

test("accessibility dictionaries keep the same action keys in both locales", () => {
  expect(Object.keys(en.a11y)).toEqual(Object.keys(zh.a11y));
  expect(en.a11y.add_to_timetable).toBe("Add course to timetable");
  expect(zh.a11y.add_to_timetable).toBe("將課程加入課表");
});
