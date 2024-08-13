if (!self.define) {
  let e,
    s = {};
  const a = (a, i) => (
    (a = new URL(a + ".js", i).href),
    s[a] ||
      new Promise((s) => {
        if ("document" in self) {
          const e = document.createElement("script");
          (e.src = a), (e.onload = s), document.head.appendChild(e);
        } else (e = a), importScripts(a), s();
      }).then(() => {
        let e = s[a];
        if (!e) throw new Error(`Module ${a} didn’t register its module`);
        return e;
      })
  );
  self.define = (i, t) => {
    const n =
      e ||
      ("document" in self ? document.currentScript.src : "") ||
      location.href;
    if (s[n]) return;
    let c = {};
    const f = (e) => a(e, n),
      d = { module: { uri: n }, exports: c, require: f };
    s[n] = Promise.all(i.map((e) => d[e] || f(e))).then((e) => (t(...e), c));
  };
}
define(["./workbox-55b8e625"], function (e) {
  "use strict";
  importScripts(),
    self.skipWaiting(),
    e.clientsClaim(),
    e.precacheAndRoute(
      [
        {
          url: "/_next/static/SUnT1CptfeXlks_7_7iA8/_buildManifest.js",
          revision: "011fb709223d2a9bb43279f211871780",
        },
        {
          url: "/_next/static/SUnT1CptfeXlks_7_7iA8/_ssgManifest.js",
          revision: "b6652df95db52feb4daf4eca35380933",
        },
        {
          url: "/_next/static/chunks/1299-099f7b9213a6d988.js",
          revision: "SUnT1CptfeXlks_7_7iA8",
        },
        {
          url: "/_next/static/chunks/1489-e51f8b6a4d2a7191.js",
          revision: "SUnT1CptfeXlks_7_7iA8",
        },
        {
          url: "/_next/static/chunks/1545-3872e289c4793384.js",
          revision: "SUnT1CptfeXlks_7_7iA8",
        },
        {
          url: "/_next/static/chunks/1621.428834a30587d007.js",
          revision: "428834a30587d007",
        },
        {
          url: "/_next/static/chunks/1761-199244e2c190b412.js",
          revision: "SUnT1CptfeXlks_7_7iA8",
        },
        {
          url: "/_next/static/chunks/1800-def4c875c733d905.js",
          revision: "SUnT1CptfeXlks_7_7iA8",
        },
        {
          url: "/_next/static/chunks/2333-5d44a1bf8909e14e.js",
          revision: "SUnT1CptfeXlks_7_7iA8",
        },
        {
          url: "/_next/static/chunks/2395-709344436e5572ce.js",
          revision: "SUnT1CptfeXlks_7_7iA8",
        },
        {
          url: "/_next/static/chunks/2399-3b10c5d75f7f0fbc.js",
          revision: "SUnT1CptfeXlks_7_7iA8",
        },
        {
          url: "/_next/static/chunks/2453-9a8ad22c132385ed.js",
          revision: "SUnT1CptfeXlks_7_7iA8",
        },
        {
          url: "/_next/static/chunks/260-c1ed4c30c2c18490.js",
          revision: "SUnT1CptfeXlks_7_7iA8",
        },
        {
          url: "/_next/static/chunks/2749-7ea861b293c8e264.js",
          revision: "SUnT1CptfeXlks_7_7iA8",
        },
        {
          url: "/_next/static/chunks/315-fb00f2d47e4008ca.js",
          revision: "SUnT1CptfeXlks_7_7iA8",
        },
        {
          url: "/_next/static/chunks/346-22718f76fb5b8564.js",
          revision: "SUnT1CptfeXlks_7_7iA8",
        },
        {
          url: "/_next/static/chunks/3567-d7b72915a895ee78.js",
          revision: "SUnT1CptfeXlks_7_7iA8",
        },
        {
          url: "/_next/static/chunks/3790-f4eea7f435bffbfe.js",
          revision: "SUnT1CptfeXlks_7_7iA8",
        },
        {
          url: "/_next/static/chunks/3854-79e0d8e10dfdea95.js",
          revision: "SUnT1CptfeXlks_7_7iA8",
        },
        {
          url: "/_next/static/chunks/3898-c6a60652dc91f9ce.js",
          revision: "SUnT1CptfeXlks_7_7iA8",
        },
        {
          url: "/_next/static/chunks/396464d2-de3fd2faef5ccdc8.js",
          revision: "SUnT1CptfeXlks_7_7iA8",
        },
        {
          url: "/_next/static/chunks/3995-f9f3fc3476303488.js",
          revision: "SUnT1CptfeXlks_7_7iA8",
        },
        {
          url: "/_next/static/chunks/4199-03d40c26d299ebc8.js",
          revision: "SUnT1CptfeXlks_7_7iA8",
        },
        {
          url: "/_next/static/chunks/4332-3a6124696dfdb87a.js",
          revision: "SUnT1CptfeXlks_7_7iA8",
        },
        {
          url: "/_next/static/chunks/4434-9986ab829af0f20f.js",
          revision: "SUnT1CptfeXlks_7_7iA8",
        },
        {
          url: "/_next/static/chunks/5194-defbe8d7c7ceb83e.js",
          revision: "SUnT1CptfeXlks_7_7iA8",
        },
        {
          url: "/_next/static/chunks/5550-e9e1f3846edae65b.js",
          revision: "SUnT1CptfeXlks_7_7iA8",
        },
        {
          url: "/_next/static/chunks/564-4891da36d99f66b0.js",
          revision: "SUnT1CptfeXlks_7_7iA8",
        },
        {
          url: "/_next/static/chunks/5649-64a4eaa9e28d9b76.js",
          revision: "SUnT1CptfeXlks_7_7iA8",
        },
        {
          url: "/_next/static/chunks/5762-1ba528b7dcf630c1.js",
          revision: "SUnT1CptfeXlks_7_7iA8",
        },
        {
          url: "/_next/static/chunks/5841-351fda75c075c4c5.js",
          revision: "SUnT1CptfeXlks_7_7iA8",
        },
        {
          url: "/_next/static/chunks/6102-f7c8c2b05e8d8cbc.js",
          revision: "SUnT1CptfeXlks_7_7iA8",
        },
        {
          url: "/_next/static/chunks/645-37ec64d10e49d6cc.js",
          revision: "SUnT1CptfeXlks_7_7iA8",
        },
        {
          url: "/_next/static/chunks/6480-8511602fde01fda9.js",
          revision: "SUnT1CptfeXlks_7_7iA8",
        },
        {
          url: "/_next/static/chunks/6521-608be2b272615eee.js",
          revision: "SUnT1CptfeXlks_7_7iA8",
        },
        {
          url: "/_next/static/chunks/6621-ae519a2f00de3678.js",
          revision: "SUnT1CptfeXlks_7_7iA8",
        },
        {
          url: "/_next/static/chunks/7137-f3ae99dd29f095f9.js",
          revision: "SUnT1CptfeXlks_7_7iA8",
        },
        {
          url: "/_next/static/chunks/7232-48e56c1fdda23615.js",
          revision: "SUnT1CptfeXlks_7_7iA8",
        },
        {
          url: "/_next/static/chunks/7349-9d57175622caea11.js",
          revision: "SUnT1CptfeXlks_7_7iA8",
        },
        {
          url: "/_next/static/chunks/7401-ccf177aa8123c8e9.js",
          revision: "SUnT1CptfeXlks_7_7iA8",
        },
        {
          url: "/_next/static/chunks/7548-b46a81cab0721690.js",
          revision: "SUnT1CptfeXlks_7_7iA8",
        },
        {
          url: "/_next/static/chunks/7615-a6746f6448bc8676.js",
          revision: "SUnT1CptfeXlks_7_7iA8",
        },
        {
          url: "/_next/static/chunks/7632-8bdc00503505cc91.js",
          revision: "SUnT1CptfeXlks_7_7iA8",
        },
        {
          url: "/_next/static/chunks/7674.e136fb2db269b75f.js",
          revision: "e136fb2db269b75f",
        },
        {
          url: "/_next/static/chunks/7773-01a4507b1bbe2e78.js",
          revision: "SUnT1CptfeXlks_7_7iA8",
        },
        {
          url: "/_next/static/chunks/7854-16fa42efb16fc068.js",
          revision: "SUnT1CptfeXlks_7_7iA8",
        },
        {
          url: "/_next/static/chunks/7872-f7784b873394afb7.js",
          revision: "SUnT1CptfeXlks_7_7iA8",
        },
        {
          url: "/_next/static/chunks/7882-bdf83406dc070451.js",
          revision: "SUnT1CptfeXlks_7_7iA8",
        },
        {
          url: "/_next/static/chunks/8326-f5e48da2147cb57a.js",
          revision: "SUnT1CptfeXlks_7_7iA8",
        },
        {
          url: "/_next/static/chunks/9284-6efa95062f3e2df6.js",
          revision: "SUnT1CptfeXlks_7_7iA8",
        },
        {
          url: "/_next/static/chunks/9401-325a991be95897a6.js",
          revision: "SUnT1CptfeXlks_7_7iA8",
        },
        {
          url: "/_next/static/chunks/9492-304ab90af6394c98.js",
          revision: "SUnT1CptfeXlks_7_7iA8",
        },
        {
          url: "/_next/static/chunks/9669-4f64f169c9604f17.js",
          revision: "SUnT1CptfeXlks_7_7iA8",
        },
        {
          url: "/_next/static/chunks/app/%5Blang%5D/(admin)/admin/cds/%5Bterm%5D/@courselist/default-3b371724108b3b47.js",
          revision: "SUnT1CptfeXlks_7_7iA8",
        },
        {
          url: "/_next/static/chunks/app/%5Blang%5D/(admin)/admin/cds/%5Bterm%5D/@submissions/%5BcourseId%5D/loading-5e4b02aca6358da9.js",
          revision: "SUnT1CptfeXlks_7_7iA8",
        },
        {
          url: "/_next/static/chunks/app/%5Blang%5D/(admin)/admin/cds/%5Bterm%5D/@submissions/%5BcourseId%5D/page-404b3787dee307b6.js",
          revision: "SUnT1CptfeXlks_7_7iA8",
        },
        {
          url: "/_next/static/chunks/app/%5Blang%5D/(admin)/admin/cds/%5Bterm%5D/@submissions/default-d6eac450e99c73e0.js",
          revision: "SUnT1CptfeXlks_7_7iA8",
        },
        {
          url: "/_next/static/chunks/app/%5Blang%5D/(admin)/admin/cds/%5Bterm%5D/error-0ed6a0d52168d9f9.js",
          revision: "SUnT1CptfeXlks_7_7iA8",
        },
        {
          url: "/_next/static/chunks/app/%5Blang%5D/(admin)/admin/cds/%5Bterm%5D/layout-7e3e96828238f9a8.js",
          revision: "SUnT1CptfeXlks_7_7iA8",
        },
        {
          url: "/_next/static/chunks/app/%5Blang%5D/(admin)/admin/cds/%5Bterm%5D/page-c3e501e67a406cc2.js",
          revision: "SUnT1CptfeXlks_7_7iA8",
        },
        {
          url: "/_next/static/chunks/app/%5Blang%5D/(admin)/admin/cds/page-81d3ecef1bb30bf9.js",
          revision: "SUnT1CptfeXlks_7_7iA8",
        },
        {
          url: "/_next/static/chunks/app/%5Blang%5D/(admin)/admin/layout-7a841d9b3e355ea3.js",
          revision: "SUnT1CptfeXlks_7_7iA8",
        },
        {
          url: "/_next/static/chunks/app/%5Blang%5D/(side-pages)/issues/page-ce39796afb091295.js",
          revision: "SUnT1CptfeXlks_7_7iA8",
        },
        {
          url: "/_next/static/chunks/app/%5Blang%5D/(side-pages)/privacy-policy/page-e35d0fd859856c8f.js",
          revision: "SUnT1CptfeXlks_7_7iA8",
        },
        {
          url: "/_next/static/chunks/app/%5Blang%5D/(venues)/venues/@content/%5BlocationId%5D/page-c612c682dd0e3a31.js",
          revision: "SUnT1CptfeXlks_7_7iA8",
        },
        {
          url: "/_next/static/chunks/app/%5Blang%5D/(venues)/venues/@content/layout-75969ecd9fe0fc03.js",
          revision: "SUnT1CptfeXlks_7_7iA8",
        },
        {
          url: "/_next/static/chunks/app/%5Blang%5D/(venues)/venues/@content/page-c271d19381dcbed5.js",
          revision: "SUnT1CptfeXlks_7_7iA8",
        },
        {
          url: "/_next/static/chunks/app/%5Blang%5D/(venues)/venues/@sidebar/%5BlocationId%5D/page-06748a4bf0293ad9.js",
          revision: "SUnT1CptfeXlks_7_7iA8",
        },
        {
          url: "/_next/static/chunks/app/%5Blang%5D/(venues)/venues/@sidebar/layout-367c214c8001adcb.js",
          revision: "SUnT1CptfeXlks_7_7iA8",
        },
        {
          url: "/_next/static/chunks/app/%5Blang%5D/(venues)/venues/@sidebar/page-d66c86a366e4b7be.js",
          revision: "SUnT1CptfeXlks_7_7iA8",
        },
        {
          url: "/_next/static/chunks/app/%5Blang%5D/(venues)/venues/layout-d88291dabc4e8add.js",
          revision: "SUnT1CptfeXlks_7_7iA8",
        },
        {
          url: "/_next/static/chunks/app/%5Blang%5D/(venues)/venues/page-c59a7d69d768b608.js",
          revision: "SUnT1CptfeXlks_7_7iA8",
        },
        {
          url: "/_next/static/chunks/app/%5Blang%5D/ais-redirect/%5B...path%5D/page-4359001139f2a6d2.js",
          revision: "SUnT1CptfeXlks_7_7iA8",
        },
        {
          url: "/_next/static/chunks/app/%5Blang%5D/apps/page-372a42c1dd90ed3b.js",
          revision: "SUnT1CptfeXlks_7_7iA8",
        },
        {
          url: "/_next/static/chunks/app/%5Blang%5D/bus/bus/%5BbusId%5D/page-207b1e00e30b778a.js",
          revision: "SUnT1CptfeXlks_7_7iA8",
        },
        {
          url: "/_next/static/chunks/app/%5Blang%5D/bus/layout-55127702fdab44a5.js",
          revision: "SUnT1CptfeXlks_7_7iA8",
        },
        {
          url: "/_next/static/chunks/app/%5Blang%5D/bus/page-3878aaef0594fd42.js",
          revision: "SUnT1CptfeXlks_7_7iA8",
        },
        {
          url: "/_next/static/chunks/app/%5Blang%5D/bus/stop/%5BstopId%5D/page-3b529f3013cacc8e.js",
          revision: "SUnT1CptfeXlks_7_7iA8",
        },
        {
          url: "/_next/static/chunks/app/%5Blang%5D/cds/error-0d6c754b6e117621.js",
          revision: "SUnT1CptfeXlks_7_7iA8",
        },
        {
          url: "/_next/static/chunks/app/%5Blang%5D/cds/layout-2565377134d3cb25.js",
          revision: "SUnT1CptfeXlks_7_7iA8",
        },
        {
          url: "/_next/static/chunks/app/%5Blang%5D/cds/loading-450641e40569d522.js",
          revision: "SUnT1CptfeXlks_7_7iA8",
        },
        {
          url: "/_next/static/chunks/app/%5Blang%5D/cds/page-e16c7596008b9490.js",
          revision: "SUnT1CptfeXlks_7_7iA8",
        },
        {
          url: "/_next/static/chunks/app/%5Blang%5D/courses/%5BcourseId%5D/loading-e3c34c645d73a641.js",
          revision: "SUnT1CptfeXlks_7_7iA8",
        },
        {
          url: "/_next/static/chunks/app/%5Blang%5D/courses/%5BcourseId%5D/page-56871c582d23c313.js",
          revision: "SUnT1CptfeXlks_7_7iA8",
        },
        {
          url: "/_next/static/chunks/app/%5Blang%5D/courses/layout-e7bf7510737182ee.js",
          revision: "SUnT1CptfeXlks_7_7iA8",
        },
        {
          url: "/_next/static/chunks/app/%5Blang%5D/courses/page-1a4212ac3458d3a1.js",
          revision: "SUnT1CptfeXlks_7_7iA8",
        },
        {
          url: "/_next/static/chunks/app/%5Blang%5D/error-8fb99348980d016b.js",
          revision: "SUnT1CptfeXlks_7_7iA8",
        },
        {
          url: "/_next/static/chunks/app/%5Blang%5D/layout-09d6d0211b28ddf0.js",
          revision: "SUnT1CptfeXlks_7_7iA8",
        },
        {
          url: "/_next/static/chunks/app/%5Blang%5D/loading-26d21dfd7afb70ab.js",
          revision: "SUnT1CptfeXlks_7_7iA8",
        },
        {
          url: "/_next/static/chunks/app/%5Blang%5D/not-found-6b782bde14f73b66.js",
          revision: "SUnT1CptfeXlks_7_7iA8",
        },
        {
          url: "/_next/static/chunks/app/%5Blang%5D/settings/layout-a6ffb7c2bf3fc6fc.js",
          revision: "SUnT1CptfeXlks_7_7iA8",
        },
        {
          url: "/_next/static/chunks/app/%5Blang%5D/settings/page-39f848cd5954d1e6.js",
          revision: "SUnT1CptfeXlks_7_7iA8",
        },
        {
          url: "/_next/static/chunks/app/%5Blang%5D/shops/layout-910dfcfe4c082ca1.js",
          revision: "SUnT1CptfeXlks_7_7iA8",
        },
        {
          url: "/_next/static/chunks/app/%5Blang%5D/shops/page-8bc9a9b464b590fc.js",
          revision: "SUnT1CptfeXlks_7_7iA8",
        },
        {
          url: "/_next/static/chunks/app/%5Blang%5D/student/grades/layout-1a34866202b9ad1f.js",
          revision: "SUnT1CptfeXlks_7_7iA8",
        },
        {
          url: "/_next/static/chunks/app/%5Blang%5D/student/grades/page-44795931bbdef0c6.js",
          revision: "SUnT1CptfeXlks_7_7iA8",
        },
        {
          url: "/_next/static/chunks/app/%5Blang%5D/student/page-a680a731be0fe638.js",
          revision: "SUnT1CptfeXlks_7_7iA8",
        },
        {
          url: "/_next/static/chunks/app/%5Blang%5D/timetable/%5BcourseId%5D/page-1ea944389063a9e5.js",
          revision: "SUnT1CptfeXlks_7_7iA8",
        },
        {
          url: "/_next/static/chunks/app/%5Blang%5D/timetable/layout-8db055233bc6e1c8.js",
          revision: "SUnT1CptfeXlks_7_7iA8",
        },
        {
          url: "/_next/static/chunks/app/%5Blang%5D/timetable/page-3ea41b94c3987b5b.js",
          revision: "SUnT1CptfeXlks_7_7iA8",
        },
        {
          url: "/_next/static/chunks/app/%5Blang%5D/timetable/view/page-ce03abebd61b0181.js",
          revision: "SUnT1CptfeXlks_7_7iA8",
        },
        {
          url: "/_next/static/chunks/app/%5Blang%5D/today/layout-e70ba4a7748be52b.js",
          revision: "SUnT1CptfeXlks_7_7iA8",
        },
        {
          url: "/_next/static/chunks/app/%5Blang%5D/today/page-33d81a8c7a6d8173.js",
          revision: "SUnT1CptfeXlks_7_7iA8",
        },
        {
          url: "/_next/static/chunks/app/%5Blang%5D/waitlist/layout-707ade163e6b3741.js",
          revision: "SUnT1CptfeXlks_7_7iA8",
        },
        {
          url: "/_next/static/chunks/app/%5Blang%5D/waitlist/page-b237f3cfecd63de0.js",
          revision: "SUnT1CptfeXlks_7_7iA8",
        },
        {
          url: "/_next/static/chunks/app/_not-found-1ea04416a5034ff2.js",
          revision: "SUnT1CptfeXlks_7_7iA8",
        },
        {
          url: "/_next/static/chunks/d0deef33-18ac5af9223d4a81.js",
          revision: "SUnT1CptfeXlks_7_7iA8",
        },
        {
          url: "/_next/static/chunks/fd9d1056-d39e54afe43fda0f.js",
          revision: "SUnT1CptfeXlks_7_7iA8",
        },
        {
          url: "/_next/static/chunks/framework-46cc04d4b74d5f72.js",
          revision: "SUnT1CptfeXlks_7_7iA8",
        },
        {
          url: "/_next/static/chunks/main-app-da66733289a61200.js",
          revision: "SUnT1CptfeXlks_7_7iA8",
        },
        {
          url: "/_next/static/chunks/main-e2aaf580655000dc.js",
          revision: "SUnT1CptfeXlks_7_7iA8",
        },
        {
          url: "/_next/static/chunks/pages/_app-90769558c7fbfb24.js",
          revision: "SUnT1CptfeXlks_7_7iA8",
        },
        {
          url: "/_next/static/chunks/pages/_error-c9d4f5e99ba523fc.js",
          revision: "SUnT1CptfeXlks_7_7iA8",
        },
        {
          url: "/_next/static/chunks/polyfills-c67a75d1b6f99dc8.js",
          revision: "837c0df77fd5009c9e46d446188ecfd0",
        },
        {
          url: "/_next/static/chunks/webpack-7a76baf4290b51a7.js",
          revision: "SUnT1CptfeXlks_7_7iA8",
        },
        {
          url: "/_next/static/css/00dd9dd91242203c.css",
          revision: "00dd9dd91242203c",
        },
        {
          url: "/_next/static/css/050f6aeb0620e0c0.css",
          revision: "050f6aeb0620e0c0",
        },
        {
          url: "/_next/static/css/fc1c9daac70c093b.css",
          revision: "fc1c9daac70c093b",
        },
        {
          url: "/_next/static/media/007e36cd86ecfe27-s.woff2",
          revision: "1d9d9a07a8ceaae0faeffb22cac609ab",
        },
        {
          url: "/_next/static/media/00f6fe109737c3fd-s.woff2",
          revision: "061b01d9cf40f87cffaf7d1ca663233a",
        },
        {
          url: "/_next/static/media/019041d6f778cb6c-s.woff2",
          revision: "8d70cb5b4bc551bdb84f235f5b424aff",
        },
        {
          url: "/_next/static/media/04d06ef04980eb3b-s.woff2",
          revision: "73a2f2b9e6994ae83ead8e8b312bd5cd",
        },
        {
          url: "/_next/static/media/05a31a2ca4975f99-s.woff2",
          revision: "f1b44860c66554b91f3b1c81556f73ca",
        },
        {
          url: "/_next/static/media/05f07890757d9f6f-s.woff2",
          revision: "71b4f81c46b5e61422485fd82f435050",
        },
        {
          url: "/_next/static/media/06d1eb18badf7ddf-s.woff2",
          revision: "a737c4e1e19a985eb6ec50b053830f86",
        },
        {
          url: "/_next/static/media/08393b799a0a4ded-s.woff2",
          revision: "fba141f745da9f5f2771ba2e6ac6abdb",
        },
        {
          url: "/_next/static/media/0956facf1602e9b5-s.woff2",
          revision: "86ea6aae87b1b3e762d214756f0a4539",
        },
        {
          url: "/_next/static/media/0b2e55b51a1e0615-s.woff2",
          revision: "6bddac854c12ada7519c79d8b8d60fbe",
        },
        {
          url: "/_next/static/media/0ba647105d5747ce-s.woff2",
          revision: "420409c4152ad7d2f76850b63fad2497",
        },
        {
          url: "/_next/static/media/0d207b75dda981dc-s.woff2",
          revision: "541bf61287e67347c5b8140fc8dabbb1",
        },
        {
          url: "/_next/static/media/1131d24ae7370ec8-s.woff2",
          revision: "53355e68a84f03540c7d996acfcb681e",
        },
        {
          url: "/_next/static/media/14fd579d76df111b-s.woff2",
          revision: "f5d6441d5f1c223ceeabd69a73ff8231",
        },
        {
          url: "/_next/static/media/1685ad726f8cf859-s.woff2",
          revision: "50dbb0c138d0d528785ec3daa1fe50c5",
        },
        {
          url: "/_next/static/media/198fe6153d7d69fc-s.woff2",
          revision: "631a83882486be5d5a9df02c35b1d8c0",
        },
        {
          url: "/_next/static/media/19e9e0a3cbfe0dc2-s.woff2",
          revision: "31d6459d32a961d0d29b67ff491e5d48",
        },
        {
          url: "/_next/static/media/1a65fef8371ab240-s.woff2",
          revision: "139a7862ff064bd85b761a486d824d46",
        },
        {
          url: "/_next/static/media/1dfd406d30a6b87c-s.woff2",
          revision: "b9abe95fa0ffdf2b4eafaeed20d13fdb",
        },
        {
          url: "/_next/static/media/22640e2d33ab6970-s.woff2",
          revision: "f7e3acccba72f2c8a667b4577939ebd0",
        },
        {
          url: "/_next/static/media/2808906716153f18-s.woff2",
          revision: "2801235f322d559cd548a2ba5afd738b",
        },
        {
          url: "/_next/static/media/287c23c9e195e540-s.woff2",
          revision: "837c18d7320560b9af5ac1f8be742759",
        },
        {
          url: "/_next/static/media/29dc2c4f726c90b5-s.woff2",
          revision: "3f5bb8b130ed67234973b3f097df0a16",
        },
        {
          url: "/_next/static/media/2b8b0242f52397b2-s.woff2",
          revision: "ccbd73f1c24a9a9e65660579df2d29ed",
        },
        {
          url: "/_next/static/media/2cb33503f80d671c-s.woff2",
          revision: "d2deca45fffb98b53099d518d9b6ac09",
        },
        {
          url: "/_next/static/media/2d891b3c73cb41cd-s.woff2",
          revision: "72305145e4747413d602e5e7b08b8709",
        },
        {
          url: "/_next/static/media/2e3ac035460ff4e0-s.woff2",
          revision: "186a4f708f7b57d7295f957fd03cec57",
        },
        {
          url: "/_next/static/media/2eca9848d024747a-s.woff2",
          revision: "99ee2d4fda344eff5ecb3e4f8c7bd06c",
        },
        {
          url: "/_next/static/media/31a9accfb0f44122-s.woff2",
          revision: "5dcb29304e7fc7b7be8379aa72334b8a",
        },
        {
          url: "/_next/static/media/328993796d59df53-s.woff2",
          revision: "61455bf2bc50a06380d6c30e930d5f5e",
        },
        {
          url: "/_next/static/media/32c8e1b67a147b1c-s.woff2",
          revision: "6a4dd79f07e6dc077a714984c2d34f8d",
        },
        {
          url: "/_next/static/media/32cc01d7bb8efbef-s.woff2",
          revision: "7151375f3335343433d1690f4b1ea18f",
        },
        {
          url: "/_next/static/media/33f6e39dd938240f-s.woff2",
          revision: "99f5eba5bba2dd53e05d6d2759d12a20",
        },
        {
          url: "/_next/static/media/361cc631d57e9a37-s.woff2",
          revision: "2bd029f71fa5bb2bdd025eba33c555be",
        },
        {
          url: "/_next/static/media/373a299a50c4f4fd-s.woff2",
          revision: "dd97a5151d3e0dd9d60aaa4b1bb5419c",
        },
        {
          url: "/_next/static/media/3967383106d13083-s.woff2",
          revision: "5f021203c64c8db87fc40e10d9e7d2e3",
        },
        {
          url: "/_next/static/media/3c869151d8a94700-s.woff2",
          revision: "3ab8b23443794a621ff8c2993b5b953f",
        },
        {
          url: "/_next/static/media/3cffdbc0622874e5-s.woff2",
          revision: "910a5734bae0ea29fd47b8d10f4b57e9",
        },
        {
          url: "/_next/static/media/40db1c50687ef3ae-s.woff2",
          revision: "f46d07809e873c440cee246512ae1198",
        },
        {
          url: "/_next/static/media/4442779d2701b313-s.woff2",
          revision: "eda46c7806e4e0506d14db31dd3a6d2f",
        },
        {
          url: "/_next/static/media/4506903c48fc295d-s.woff2",
          revision: "6b149948ddeba936b874708869956799",
        },
        {
          url: "/_next/static/media/480c35a7666a13ef-s.woff2",
          revision: "bf276ef37433eaaafa2c7edac55df95f",
        },
        {
          url: "/_next/static/media/4b53c0ce6eac4969-s.woff2",
          revision: "091096c8ac6861334972188785543f67",
        },
        {
          url: "/_next/static/media/513657b02c5c193f-s.woff2",
          revision: "c4eb7f37bc4206c901ab08601f21f0f2",
        },
        {
          url: "/_next/static/media/51ed15f9841b9f9d-s.woff2",
          revision: "bb9d99fb9bbc695be80777ca2c1c2bee",
        },
        {
          url: "/_next/static/media/52d85461a506b50f-s.woff2",
          revision: "8a195e8e91ef4ad02aaca129b77fcb4e",
        },
        {
          url: "/_next/static/media/53c6b591793dbbb6-s.woff2",
          revision: "810ccb8250a2607a798822aad3a2f4a5",
        },
        {
          url: "/_next/static/media/5941ec4c0d66dc22-s.woff2",
          revision: "3108f62b77c557a5f9635a6031badd2a",
        },
        {
          url: "/_next/static/media/5bc10d11cc82a0d2-s.woff2",
          revision: "b7fa6a959acf0f0193216cd5cb93b9ef",
        },
        {
          url: "/_next/static/media/5c632bba26b653f4-s.woff2",
          revision: "e861980e28cab2fbb2eb8873221af74e",
        },
        {
          url: "/_next/static/media/5cd63c9fb91df901-s.woff2",
          revision: "514e1640e074e3e30fa58cf86820d8d9",
        },
        {
          url: "/_next/static/media/60efe6f0f0989ef4-s.woff2",
          revision: "e82517aa0139e7fbf0835cbae4d787b4",
        },
        {
          url: "/_next/static/media/698ee9da39e87d79-s.woff2",
          revision: "cdd417bb40fc7202a9b928ab477a9281",
        },
        {
          url: "/_next/static/media/6c588c3e700d1980-s.woff2",
          revision: "1c57aa9a759664ec34f3ac79f61b05e8",
        },
        {
          url: "/_next/static/media/6c8429942bc89423-s.woff2",
          revision: "08af84a210383d4f8f5319a767d23baf",
        },
        {
          url: "/_next/static/media/6d6ff95d9304d00a-s.woff2",
          revision: "74862c30ffe2346ff0f3576992cbd3e7",
        },
        {
          url: "/_next/static/media/70cdca847f6ba060-s.woff2",
          revision: "7683473611338a90c526c43b068713fc",
        },
        {
          url: "/_next/static/media/729118c65e036864-s.woff2",
          revision: "8f830faf9eb3666df5c30ef051334301",
        },
        {
          url: "/_next/static/media/79710fabba120e04-s.woff2",
          revision: "d3b3f6f64b84c9253c0bfdfdb356abcd",
        },
        {
          url: "/_next/static/media/79e6a40ff7e55dfb-s.woff2",
          revision: "b64b0efa501dfdbcbc3f2c4590fb35a4",
        },
        {
          url: "/_next/static/media/7a760c7a92d40828-s.woff2",
          revision: "ab77a8f45bfaf72a632db70c85f0119c",
        },
        {
          url: "/_next/static/media/7db9d1101db27256-s.woff2",
          revision: "2f9e0ce78260739ce65b76a59ed67397",
        },
        {
          url: "/_next/static/media/7fa8053b3f72678b-s.woff2",
          revision: "236bddf7212b71e85974a31a3628252e",
        },
        {
          url: "/_next/static/media/82f38d18479d7627-s.woff2",
          revision: "1e84d4627cad7d6089a47eeeb737050a",
        },
        {
          url: "/_next/static/media/8580add641746514-s.woff2",
          revision: "2961c2f097e546f690f2e923e799e57b",
        },
        {
          url: "/_next/static/media/85a2b0ee08e9e772-s.woff2",
          revision: "e84d98990ef3ff490ebe4770dc1438cb",
        },
        {
          url: "/_next/static/media/87df6c285ea0f99f-s.woff2",
          revision: "d1891b53330c0cf68406cc1d30e0e149",
        },
        {
          url: "/_next/static/media/93f99f688be05475-s.woff2",
          revision: "59d9ce871662c4652b059e43e7f075e7",
        },
        {
          url: "/_next/static/media/94739437559397d9-s.woff2",
          revision: "c3229fe35edf5e8220ff631156ec3e91",
        },
        {
          url: "/_next/static/media/94e096e0d4faf2d6-s.woff2",
          revision: "c7ae11a28a5ea88f8073e164fc69f237",
        },
        {
          url: "/_next/static/media/955ff301f2679fde-s.woff2",
          revision: "3ee23842c2c9bde540529092873b982d",
        },
        {
          url: "/_next/static/media/9719372f17313b04-s.woff2",
          revision: "30791f107b61656126ab41e31f9c9eb0",
        },
        {
          url: "/_next/static/media/971f5f01dfcfee02-s.woff2",
          revision: "b7619446d72eaef0e7eae817ba731b26",
        },
        {
          url: "/_next/static/media/97dc7241da8bb8a7-s.woff2",
          revision: "95729c593a0eab0488c33cacbd13ad82",
        },
        {
          url: "/_next/static/media/999d7df656bcbd70-s.woff2",
          revision: "ff02d926dad78593343f43a055fe62e1",
        },
        {
          url: "/_next/static/media/9a5e2f712cce3f1a-s.woff2",
          revision: "d3fb779c589500801148f92b3a2c0972",
        },
        {
          url: "/_next/static/media/9acce1dcf4575f9e-s.woff2",
          revision: "dace84211fe1f63472c8c29c094b0828",
        },
        {
          url: "/_next/static/media/a5c2d2b71317457b-s.woff2",
          revision: "7ad6c696c605ab144b9e026445acad2c",
        },
        {
          url: "/_next/static/media/ac409d512cf37aba-s.woff2",
          revision: "436f89090c9d6af5d2e689008c32efe4",
        },
        {
          url: "/_next/static/media/ac658f499b127b1b-s.woff2",
          revision: "9827f06f5b7f848ec971684d99b8bf79",
        },
        {
          url: "/_next/static/media/ad6c639bd645f8cb-s.woff2",
          revision: "023e108de679f9e4fafe89eefd0b0cdb",
        },
        {
          url: "/_next/static/media/b14a05700a4cb141-s.woff2",
          revision: "3007487bba4a82f407203cdbf783892f",
        },
        {
          url: "/_next/static/media/b1bb8a75a8649131-s.woff2",
          revision: "64c5fb5938e0fbb7740982998a500816",
        },
        {
          url: "/_next/static/media/bd87d589ab3566f1-s.woff2",
          revision: "99d6ab8177a0291f15225139b4d4b5c7",
        },
        {
          url: "/_next/static/media/c555b60c68d44cb2-s.woff2",
          revision: "5d58eb64cbdff25c86bfe2094a0f6862",
        },
        {
          url: "/_next/static/media/c82390beca4ff964-s.woff2",
          revision: "1f20754b260a6ca496bc21e7102d70b8",
        },
        {
          url: "/_next/static/media/c9a5bc6a7c948fb0-s.p.woff2",
          revision: "74c3556b9dad12fb76f84af53ba69410",
        },
        {
          url: "/_next/static/media/cd9c9047948a1269-s.p.woff2",
          revision: "341e0cf9dc447dbb1d72c77935020769",
        },
        {
          url: "/_next/static/media/cebf8aabdb7ac0be-s.woff2",
          revision: "e3f6d8b3d0829a3dd373550a0ac215db",
        },
        {
          url: "/_next/static/media/d0088d15d7229bc2-s.woff2",
          revision: "8b86a2e6386a759d6585f04ba96421f9",
        },
        {
          url: "/_next/static/media/d06d88ed62e77115-s.woff2",
          revision: "858f21a35bcd8b1b06cb01fd03c9fe2b",
        },
        {
          url: "/_next/static/media/d5f368e1b06cc22c-s.woff2",
          revision: "8ff3ef10ac320f20d2b9d6e82551120b",
        },
        {
          url: "/_next/static/media/d6b16ce4a6175f26-s.p.woff2",
          revision: "dd930bafc6297347be3213f22cc53d3e",
        },
        {
          url: "/_next/static/media/d7847f8f7d064228-s.p.woff2",
          revision: "2bffdfdda11e0fb498cf5a97cd70777f",
        },
        {
          url: "/_next/static/media/db711dd8ee25e216-s.woff2",
          revision: "6690e30729e07218ab2d38bd3660ec9c",
        },
        {
          url: "/_next/static/media/dc5d2110fbb7f250-s.woff2",
          revision: "2914e8d34b0fc31444d9afbc7c5f8c06",
        },
        {
          url: "/_next/static/media/df7f71939237ca46-s.woff2",
          revision: "8e22ee6244b9e0857047e5db3600c700",
        },
        {
          url: "/_next/static/media/e1a0174314c962c4-s.woff2",
          revision: "227a678c936f0f741cc58cab6e9c52a8",
        },
        {
          url: "/_next/static/media/e30aeffda4648cf4-s.woff2",
          revision: "94917bc16ded9b164699d42a2535dd9a",
        },
        {
          url: "/_next/static/media/e506c40d0d74383b-s.woff2",
          revision: "155ff42bad40610e46d6d849cfccdff2",
        },
        {
          url: "/_next/static/media/e5fb66db730d1d9d-s.woff2",
          revision: "384349b6dba67d1836968c7e9e704fe8",
        },
        {
          url: "/_next/static/media/e654925cacec1b26-s.woff2",
          revision: "1010cee9b48be8641bd104cf8d2f53db",
        },
        {
          url: "/_next/static/media/ec159349637c90ad-s.woff2",
          revision: "0e89df9522084290e01e4127495fae99",
        },
        {
          url: "/_next/static/media/ec2766c8d6b3ace2-s.woff2",
          revision: "3204993d73e25d9380343eec4a291b07",
        },
        {
          url: "/_next/static/media/ef55560a424c5244-s.woff2",
          revision: "684e215b08bd066a006998600a9d95ff",
        },
        {
          url: "/_next/static/media/f03f7576db509434-s.woff2",
          revision: "ec786ba9617456b5118858d71d2d73c3",
        },
        {
          url: "/_next/static/media/f0a3f3a613ffd69a-s.woff2",
          revision: "040f00a065fb0ce4cae62d0f93c6ecd7",
        },
        {
          url: "/_next/static/media/f5d35bc7a22af182-s.woff2",
          revision: "4b4caa79880917b6cad60c3e299ce461",
        },
        {
          url: "/_next/static/media/f97850d2acef7c48-s.woff2",
          revision: "5231a3b5a1818fe995d8f2fdbe9bc8f9",
        },
        {
          url: "/_next/static/media/fd4db3eb5472fc27-s.woff2",
          revision: "71f3fcaf22131c3368d9ec28ef839831",
        },
        {
          url: "/_next/static/media/fda07e39780d992c-s.woff2",
          revision: "3dff5b36a125d448e2bb3952ace0c286",
        },
        {
          url: "/_next/static/media/ff619a19ed0306cf-s.woff2",
          revision: "13c52806f20a3fa31f9f823bd6e092a1",
        },
        {
          url: "/_next/static/media/layers-2x.9859cd12.png",
          revision: "9859cd12",
        },
        {
          url: "/_next/static/media/layers.ef6db872.png",
          revision: "ef6db872",
        },
        {
          url: "/_next/static/media/marker-icon.d577052a.png",
          revision: "d577052a",
        },
        { url: "/zh/today", revision: "SUnT1CptfeXlks_7_7iA8" },
      ],
      { ignoreURLParametersMatching: [/^utm_/, /^fbclid$/] },
    ),
    e.cleanupOutdatedCaches(),
    e.registerRoute(
      "/",
      new e.NetworkFirst({
        cacheName: "start-url",
        plugins: [
          {
            cacheWillUpdate: async ({ response: e }) =>
              e && "opaqueredirect" === e.type
                ? new Response(e.body, {
                    status: 200,
                    statusText: "OK",
                    headers: e.headers,
                  })
                : e,
          },
        ],
      }),
      "GET",
    ),
    e.registerRoute(
      /^https:\/\/fonts\.(?:gstatic)\.com\/.*/i,
      new e.CacheFirst({
        cacheName: "google-fonts-webfonts",
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 4, maxAgeSeconds: 31536e3 }),
        ],
      }),
      "GET",
    ),
    e.registerRoute(
      /^https:\/\/fonts\.(?:googleapis)\.com\/.*/i,
      new e.StaleWhileRevalidate({
        cacheName: "google-fonts-stylesheets",
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 4, maxAgeSeconds: 604800 }),
        ],
      }),
      "GET",
    ),
    e.registerRoute(
      /\.(?:eot|otf|ttc|ttf|woff|woff2|font.css)$/i,
      new e.StaleWhileRevalidate({
        cacheName: "static-font-assets",
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 4, maxAgeSeconds: 604800 }),
        ],
      }),
      "GET",
    ),
    e.registerRoute(
      /\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i,
      new e.StaleWhileRevalidate({
        cacheName: "static-image-assets",
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 2592e3 }),
        ],
      }),
      "GET",
    ),
    e.registerRoute(
      /\/_next\/static.+\.js$/i,
      new e.CacheFirst({
        cacheName: "next-static-js-assets",
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 86400 }),
        ],
      }),
      "GET",
    ),
    e.registerRoute(
      /\/_next\/image\?url=.+$/i,
      new e.StaleWhileRevalidate({
        cacheName: "next-image",
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 86400 }),
        ],
      }),
      "GET",
    ),
    e.registerRoute(
      /\.(?:mp3|wav|ogg)$/i,
      new e.CacheFirst({
        cacheName: "static-audio-assets",
        plugins: [
          new e.RangeRequestsPlugin(),
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
        ],
      }),
      "GET",
    ),
    e.registerRoute(
      /\.(?:mp4|webm)$/i,
      new e.CacheFirst({
        cacheName: "static-video-assets",
        plugins: [
          new e.RangeRequestsPlugin(),
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
        ],
      }),
      "GET",
    ),
    e.registerRoute(
      /\.(?:js)$/i,
      new e.StaleWhileRevalidate({
        cacheName: "static-js-assets",
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 48, maxAgeSeconds: 86400 }),
        ],
      }),
      "GET",
    ),
    e.registerRoute(
      /\.(?:css|less)$/i,
      new e.StaleWhileRevalidate({
        cacheName: "static-style-assets",
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
        ],
      }),
      "GET",
    ),
    e.registerRoute(
      /\/_next\/data\/.+\/.+\.json$/i,
      new e.StaleWhileRevalidate({
        cacheName: "next-data",
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
        ],
      }),
      "GET",
    ),
    e.registerRoute(
      /\.(?:json|xml|csv)$/i,
      new e.NetworkFirst({
        cacheName: "static-data-assets",
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
        ],
      }),
      "GET",
    ),
    e.registerRoute(
      ({ sameOrigin: e, url: { pathname: s } }) =>
        !(!e || s.startsWith("/api/auth/callback") || !s.startsWith("/api/")),
      new e.NetworkFirst({
        cacheName: "apis",
        networkTimeoutSeconds: 10,
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 16, maxAgeSeconds: 86400 }),
        ],
      }),
      "GET",
    ),
    e.registerRoute(
      ({ request: e, url: { pathname: s }, sameOrigin: a }) =>
        "1" === e.headers.get("RSC") &&
        "1" === e.headers.get("Next-Router-Prefetch") &&
        a &&
        !s.startsWith("/api/"),
      new e.NetworkFirst({
        cacheName: "pages-rsc-prefetch",
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
        ],
      }),
      "GET",
    ),
    e.registerRoute(
      ({ request: e, url: { pathname: s }, sameOrigin: a }) =>
        "1" === e.headers.get("RSC") && a && !s.startsWith("/api/"),
      new e.NetworkFirst({
        cacheName: "pages-rsc",
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
        ],
      }),
      "GET",
    ),
    e.registerRoute(
      ({ url: { pathname: e }, sameOrigin: s }) => s && !e.startsWith("/api/"),
      new e.NetworkFirst({
        cacheName: "pages",
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
        ],
      }),
      "GET",
    ),
    e.registerRoute(
      ({ sameOrigin: e }) => !e,
      new e.NetworkFirst({
        cacheName: "cross-origin",
        networkTimeoutSeconds: 10,
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 3600 }),
        ],
      }),
      "GET",
    );
});
//# sourceMappingURL=sw.js.map
