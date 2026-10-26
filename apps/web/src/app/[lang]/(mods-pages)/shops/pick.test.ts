import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { JSDOM } from "jsdom";
import {
  afterEach,
  describe,
  expect,
  it,
  jest,
  mock,
  setSystemTime,
} from "bun:test";
import { MemoryRouter } from "react-router-dom";
import { captureGlobalState } from "@/test-utils/global-state";
import type { DiningShop } from "./types";
import {
  classifyShop,
  getPickActionState,
  getPickRow,
  pickCandidates,
  pickRandom,
} from "./pick";

const now = new Date(2026, 9, 7, 12);

const shop = (
  name: string,
  area = "小吃部",
  weekday = "11:00-20:00",
): DiningShop => ({
  area,
  image: `${name}.jpg`,
  name,
  schedule: { weekday, saturday: weekday, sunday: weekday },
});

const passthrough = ({
  children,
  onValueChange: _onValueChange,
  ...props
}: Record<string, unknown>) =>
  createElement("div", props, children as never);
const button = ({
  children,
  onPressedChange: _onPressedChange,
  pressed: _pressed,
  ...props
}: Record<string, unknown>) =>
  createElement("button", props, children as never);

mock.module("@courseweb/ui", () => ({
  Button: button,
  Checkbox: ({
    onCheckedChange: _onCheckedChange,
    ...props
  }: Record<string, unknown>) =>
    createElement("input", { ...props, readOnly: true, type: "checkbox" }),
  Input: (props: Record<string, unknown>) => createElement("input", props),
  Select: passthrough,
  SelectContent: passthrough,
  SelectItem: passthrough,
  SelectTrigger: passthrough,
  SelectValue: passthrough,
  Toggle: button,
}));
mock.module("lucide-react", () => ({
  AlarmClockCheck: () => null,
  Dices: () => null,
  Search: () => null,
  Store: () => null,
  X: () => null,
}));
mock.module("@/dictionaries/useDictionary", () => ({
  default: () => ({
    shops: {
      search_placeholder: "Search",
      search_results_prefix: "Results",
      open_now: "Open now",
      closed: "Closed",
      area_placeholder: "Area",
      area_all: "All areas",
      pick_for_me: "Pick for me",
      pick_summary: "{count} places",
      pick_again: "Pick again",
      pick_hide: "Hide",
      pick_close: "Close",
      pick_include_snacks: "Include snacks",
      pick_reset_hidden: "Reset hidden ({count})",
      pick_no_open_area: "No open place in {area}",
      pick_no_open: "No open place",
    },
  }),
}));
mock.module("./ShopItem", () => ({
  default: ({ shop }: { shop: DiningShop }) =>
    createElement("div", { "data-shop": shop.name }, shop.name),
}));

const { default: Shops } = await import("./ShopList");

const restoreGlobals = captureGlobalState([
  "window",
  "document",
  "navigator",
  "localStorage",
  "IS_REACT_ACT_ENVIRONMENT",
]);
let activeDom: JSDOM | undefined;
let activeRoot: Root | undefined;

afterEach(() => {
  setSystemTime();
  jest.useRealTimers();
});

afterEach(async () => {
  await act(async () => activeRoot?.unmount());
  activeDom?.window.close();
  activeDom = undefined;
  activeRoot = undefined;
  restoreGlobals();
});

describe("classifyShop", () => {
  it("classifies every exact excluded name and an unknown meal", () => {
    const expected = {
      "眼鏡部": "not-food",
      "洗衣部": "not-food",
      "理髮部": "not-food",
      "利捷打字行": "not-food",
      "水木書苑": "not-food",
      "7-ELEVEN": "convenience",
      "全家便利商店": "convenience",
      "珈名鮮茶": "drink-dessert",
      "販冰冰手作甜品": "drink-dessert",
      "丘森茶室": "drink-dessert",
      Ginzeng: "drink-dessert",
      "胖達咖啡": "drink-dessert",
      "Touch Cafe": "drink-dessert",
      "茗釀茶品": "drink-dessert",
      "路易莎咖啡": "drink-dessert",
    } as const;

    for (const [name, category] of Object.entries(expected)) {
      expect(classifyShop(name)).toBe(category);
    }
    expect(classifyShop("new shop")).toBe("meal");
  });
});

describe("pick presentation state", () => {
  it("retains shuffle row placeholders after settling", () => {
    const selected = shop("selected");
    const cycle = [shop("first"), shop("second"), selected];

    expect(getPickRow(selected, cycle, 0)).toEqual({
      shops: cycle,
      visibleIndex: 0,
    });
  });

  it("disables pick actions while shuffling", () => {
    const selected = shop("selected");

    expect(getPickActionState(selected, true)).toEqual({
      disabled: true,
      shop: null,
    });
    expect(getPickActionState(selected, false)).toEqual({
      disabled: false,
      shop: selected,
    });
  });
});

describe("pickCandidates", () => {
  it("filters by the fixed open-now clock", () => {
    const shops = [shop("open"), shop("closed", "小吃部", "13:00-20:00")];
    expect(
      pickCandidates(shops, {
        now,
        area: "",
        includeSnacks: false,
        hidden: [],
      }).map(({ name }) => name),
    ).toEqual(["open"]);
  });

  it("filters by area and hidden place key", () => {
    const shops = [shop("one", "小吃部"), shop("two", "風雲1樓")];
    expect(
      pickCandidates(shops, {
        now,
        area: "風雲1樓",
        includeSnacks: false,
        hidden: ["風雲1樓|two"],
      }),
    ).toEqual([]);
  });

  it("treats an empty area and anywhere as all areas", () => {
    const shops = [shop("one", "小吃部"), shop("two", "風雲1樓")];
    expect(
      pickCandidates(shops, {
        now,
        area: "anywhere",
        includeSnacks: false,
        hidden: [],
      }),
    ).toHaveLength(2);
    expect(
      pickCandidates(shops, {
        now,
        area: "",
        includeSnacks: false,
        hidden: [],
      }),
    ).toHaveLength(2);
  });

  it("excludes snack places by default but includes them on request", () => {
    const shops = [
      shop("meal"),
      shop("7-ELEVEN"),
      shop("胖達咖啡"),
      shop("眼鏡部"),
      shop("洗衣部"),
      shop("理髮部"),
      shop("利捷打字行"),
      shop("水木書苑"),
    ];
    expect(
      pickCandidates(shops, {
        now,
        area: "",
        includeSnacks: false,
        hidden: [],
      }).map(({ name }) => name),
    ).toEqual(["meal"]);
    expect(
      pickCandidates(shops, {
        now,
        area: "",
        includeSnacks: true,
        hidden: [],
      }).map(({ name }) => name),
    ).toEqual(["meal", "7-ELEVEN", "胖達咖啡"]);
  });

  it("returns no candidates when every open place is excluded", () => {
    expect(
      pickCandidates([shop("眼鏡部")], {
        now,
        area: "",
        includeSnacks: true,
        hidden: [],
      }),
    ).toEqual([]);
  });
});

describe("pickRandom", () => {
  it("selects every bucket equally across a deterministic sample sequence", () => {
    const candidates = ["a", "b", "c", "d"];
    const samples = Array.from({ length: 400 }, (_, index) =>
      ((index % candidates.length) + 0.5) / candidates.length,
    );
    const counts = samples.reduce<Record<string, number>>((result, value) => {
      const picked = pickRandom(candidates, () => value)!;
      result[picked] = (result[picked] ?? 0) + 1;
      return result;
    }, {});

    expect(counts).toEqual({ a: 100, b: 100, c: 100, d: 100 });
    expect(pickRandom(candidates, () => 0)).toBe("a");
    expect(pickRandom(candidates, () => 0.25)).toBe("b");
    expect(pickRandom(candidates, () => 0.999)).toBe("d");
    expect(pickRandom(candidates, () => 1)).toBe("d");
    expect(pickRandom(candidates, () => -1)).toBe("a");
    expect(pickRandom([], () => 0)).toBeUndefined();
  });
});

describe("Shops picker", () => {
  it("disables picker actions during shuffle and retains the row after settling", async () => {
    jest.useFakeTimers();
    setSystemTime(now);
    activeDom = new JSDOM("<!doctype html><html><body></body></html>", {
      url: "http://localhost/en/shops",
    });
    Object.assign(globalThis, {
      window: activeDom.window,
      document: activeDom.window.document,
      navigator: activeDom.window.navigator,
      localStorage: activeDom.window.localStorage,
      IS_REACT_ACT_ENVIRONMENT: true,
    });

    const container = document.createElement("div");
    document.body.appendChild(container);
    activeRoot = createRoot(container);
    await act(async () => {
      activeRoot!.render(
        createElement(
          MemoryRouter,
          { initialEntries: ["/en/shops"] },
          createElement(Shops, {
            data: [
              { building: "Test", restaurants: [shop("one"), shop("two")] },
            ],
          }),
        ),
      );
    });

    const findButton = (label: string) =>
      [...container.querySelectorAll("button")].find(
        (candidate) => candidate.textContent === label,
      ) as HTMLButtonElement | undefined;
    const dices = container.querySelector(
      'button[aria-label="Pick for me"]',
    ) as HTMLButtonElement;

    await act(async () => dices.click());

    expect(dices.disabled).toBe(true);
    expect(findButton("Pick again")?.disabled).toBe(true);
    expect(findButton("Hide")?.disabled).toBe(true);
    const rowBeforeSettling = container.querySelector("div.grid.min-w-0");
    expect(rowBeforeSettling).not.toBeNull();
    expect(rowBeforeSettling?.children).toHaveLength(8);

    await act(async () => {
      jest.advanceTimersByTime(8 * 80);
    });

    const rowAfterSettling = container.querySelector("div.grid.min-w-0");
    expect(rowAfterSettling).not.toBeNull();
    expect(rowAfterSettling?.className).toBe(rowBeforeSettling?.className);
    expect(rowAfterSettling?.children).toHaveLength(8);
    expect(dices.disabled).toBe(false);
    expect(findButton("Pick again")?.disabled).toBe(false);
    expect(findButton("Hide")?.disabled).toBe(false);
  });

  it("picks only from open shops in a deep-linked building filter", async () => {
    jest.useFakeTimers();
    setSystemTime(now);
    activeDom = new JSDOM("<!doctype html><html><body></body></html>", {
      url: "http://localhost/en/shops?building=%E9%A2%A8%E9%9B%B2",
    });
    Object.assign(globalThis, {
      window: activeDom.window,
      document: activeDom.window.document,
      navigator: activeDom.window.navigator,
      localStorage: activeDom.window.localStorage,
      IS_REACT_ACT_ENVIRONMENT: true,
    });

    const container = document.createElement("div");
    document.body.appendChild(container);
    activeRoot = createRoot(container);
    await act(async () => {
      activeRoot!.render(
        createElement(
          MemoryRouter,
          { initialEntries: ["/en/shops?building=%E9%A2%A8%E9%9B%B2"] },
          createElement(Shops, {
            data: [
              {
                building: "Test",
                restaurants: [
                  shop("filtered open", "風雲1樓"),
                  shop("filtered closed", "風雲2樓", "13:00-20:00"),
                  shop("outside open", "小吃部"),
                ],
              },
            ],
          }),
        ),
      );
    });

    const dices = container.querySelector(
      'button[aria-label="Pick for me"]',
    ) as HTMLButtonElement;

    await act(async () => dices.click());

    expect(container.textContent).toContain("1 places");
    expect(
      container
        .querySelector("div.flex.flex-col.gap-2.py-4 [data-shop]")
        ?.getAttribute("data-shop"),
    ).toBe("filtered open");
  });
});
