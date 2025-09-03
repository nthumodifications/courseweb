if (!self.define) {
  let e,
    a = {};
  const s = (s, n) => (
    (s = new URL(s + ".js", n).href),
    a[s] ||
      new Promise((a) => {
        if ("document" in self) {
          const e = document.createElement("script");
          (e.src = s), (e.onload = a), document.head.appendChild(e);
        } else (e = s), importScripts(s), a();
      }).then(() => {
        let e = a[s];
        if (!e) throw new Error(`Module ${s} didn’t register its module`);
        return e;
      })
  );
  self.define = (n, d) => {
    const i =
      e ||
      ("document" in self ? document.currentScript.src : "") ||
      location.href;
    if (a[i]) return;
    let c = {};
    const t = (e) => s(e, i),
      f = { module: { uri: i }, exports: c, require: t };
    a[i] = Promise.all(n.map((e) => f[e] || t(e))).then((e) => (d(...e), c));
  };
}
define(["./workbox-93afbf15"], function (e) {
  "use strict";
  importScripts("/fallback-ce627215c0e4a9af.js"),
    self.skipWaiting(),
    e.clientsClaim(),
    e.precacheAndRoute(
      [
        {
          url: "/_next/static/4t1arUdu0N3OnMT4szdn2/_buildManifest.js",
          revision: "76bca2f40de6b8dcebcc4eac6ce07c68",
        },
        {
          url: "/_next/static/4t1arUdu0N3OnMT4szdn2/_ssgManifest.js",
          revision: "b6652df95db52feb4daf4eca35380933",
        },
        {
          url: "/_next/static/chunks/1044-08bf529c5223e164.js",
          revision: "4t1arUdu0N3OnMT4szdn2",
        },
        {
          url: "/_next/static/chunks/1090.4282e48719cdb508.js",
          revision: "4282e48719cdb508",
        },
        {
          url: "/_next/static/chunks/1253.50fe39ecb6f51f32.js",
          revision: "50fe39ecb6f51f32",
        },
        {
          url: "/_next/static/chunks/1737-3541ecf0366b5a02.js",
          revision: "4t1arUdu0N3OnMT4szdn2",
        },
        {
          url: "/_next/static/chunks/1dd3208c-cfb324703cbc5803.js",
          revision: "4t1arUdu0N3OnMT4szdn2",
        },
        {
          url: "/_next/static/chunks/2147-3b01bbb4e94bbc16.js",
          revision: "4t1arUdu0N3OnMT4szdn2",
        },
        {
          url: "/_next/static/chunks/2669-6de774d35384d3ff.js",
          revision: "4t1arUdu0N3OnMT4szdn2",
        },
        {
          url: "/_next/static/chunks/270-3847c45ecd2ad904.js",
          revision: "4t1arUdu0N3OnMT4szdn2",
        },
        {
          url: "/_next/static/chunks/3042-d3eedc5687b9af6a.js",
          revision: "4t1arUdu0N3OnMT4szdn2",
        },
        {
          url: "/_next/static/chunks/3043-7fce40b71eed9793.js",
          revision: "4t1arUdu0N3OnMT4szdn2",
        },
        {
          url: "/_next/static/chunks/3162-e6519d7da64d7ef1.js",
          revision: "4t1arUdu0N3OnMT4szdn2",
        },
        {
          url: "/_next/static/chunks/3254-8e55b3a313878336.js",
          revision: "4t1arUdu0N3OnMT4szdn2",
        },
        {
          url: "/_next/static/chunks/3328-eb1f66f3c692e9f4.js",
          revision: "4t1arUdu0N3OnMT4szdn2",
        },
        {
          url: "/_next/static/chunks/3406-a3084898ccf48ce2.js",
          revision: "4t1arUdu0N3OnMT4szdn2",
        },
        {
          url: "/_next/static/chunks/3440-f136d4ed1043e528.js",
          revision: "4t1arUdu0N3OnMT4szdn2",
        },
        {
          url: "/_next/static/chunks/3441-c28d80ee33070ccd.js",
          revision: "4t1arUdu0N3OnMT4szdn2",
        },
        {
          url: "/_next/static/chunks/3672-130c5f45ba4d941f.js",
          revision: "4t1arUdu0N3OnMT4szdn2",
        },
        {
          url: "/_next/static/chunks/3703-f08e0fa13d83ff94.js",
          revision: "4t1arUdu0N3OnMT4szdn2",
        },
        {
          url: "/_next/static/chunks/4041-176a873f2d6dab15.js",
          revision: "4t1arUdu0N3OnMT4szdn2",
        },
        {
          url: "/_next/static/chunks/4266-33ccacb1c30d0d45.js",
          revision: "4t1arUdu0N3OnMT4szdn2",
        },
        {
          url: "/_next/static/chunks/4515-b224b457277a579c.js",
          revision: "4t1arUdu0N3OnMT4szdn2",
        },
        {
          url: "/_next/static/chunks/464-bf6ceafeecc21664.js",
          revision: "4t1arUdu0N3OnMT4szdn2",
        },
        {
          url: "/_next/static/chunks/4962-0d2bd3eb531a0584.js",
          revision: "4t1arUdu0N3OnMT4szdn2",
        },
        {
          url: "/_next/static/chunks/510.074f19c01eb8e0c6.js",
          revision: "074f19c01eb8e0c6",
        },
        {
          url: "/_next/static/chunks/5140-f8d66c1c8b17c185.js",
          revision: "4t1arUdu0N3OnMT4szdn2",
        },
        {
          url: "/_next/static/chunks/5525-94ecfdaf40db454a.js",
          revision: "4t1arUdu0N3OnMT4szdn2",
        },
        {
          url: "/_next/static/chunks/5814-85aef3b64f8eef0c.js",
          revision: "4t1arUdu0N3OnMT4szdn2",
        },
        {
          url: "/_next/static/chunks/5856.4b6a9bfbd134979d.js",
          revision: "4b6a9bfbd134979d",
        },
        {
          url: "/_next/static/chunks/5974.ac892b7968341e04.js",
          revision: "ac892b7968341e04",
        },
        {
          url: "/_next/static/chunks/6242-6975ab24e36d92cd.js",
          revision: "4t1arUdu0N3OnMT4szdn2",
        },
        {
          url: "/_next/static/chunks/6307-51aa5b71468a30ec.js",
          revision: "4t1arUdu0N3OnMT4szdn2",
        },
        {
          url: "/_next/static/chunks/6337-3c87db736116d24c.js",
          revision: "4t1arUdu0N3OnMT4szdn2",
        },
        {
          url: "/_next/static/chunks/6340-298f58979984c756.js",
          revision: "4t1arUdu0N3OnMT4szdn2",
        },
        {
          url: "/_next/static/chunks/6782.13d0eab5ba599504.js",
          revision: "13d0eab5ba599504",
        },
        {
          url: "/_next/static/chunks/699-97024d9ac06ffb23.js",
          revision: "4t1arUdu0N3OnMT4szdn2",
        },
        {
          url: "/_next/static/chunks/7009-196e04f3290d2d58.js",
          revision: "4t1arUdu0N3OnMT4szdn2",
        },
        {
          url: "/_next/static/chunks/7156-de6e9e9f7e7c96f3.js",
          revision: "4t1arUdu0N3OnMT4szdn2",
        },
        {
          url: "/_next/static/chunks/7350-8aea9fa6b290fe3c.js",
          revision: "4t1arUdu0N3OnMT4szdn2",
        },
        {
          url: "/_next/static/chunks/7397.d80d9f668a5b2cab.js",
          revision: "d80d9f668a5b2cab",
        },
        {
          url: "/_next/static/chunks/7618-89660ba7912b9fa1.js",
          revision: "4t1arUdu0N3OnMT4szdn2",
        },
        {
          url: "/_next/static/chunks/7879-08b2230802615858.js",
          revision: "4t1arUdu0N3OnMT4szdn2",
        },
        {
          url: "/_next/static/chunks/8202-7d58881bfbfc4fe4.js",
          revision: "4t1arUdu0N3OnMT4szdn2",
        },
        {
          url: "/_next/static/chunks/8500-b651c5523c379144.js",
          revision: "4t1arUdu0N3OnMT4szdn2",
        },
        {
          url: "/_next/static/chunks/9052-e1d9987bdac3ea29.js",
          revision: "4t1arUdu0N3OnMT4szdn2",
        },
        {
          url: "/_next/static/chunks/9453-7ece76eb95e96563.js",
          revision: "4t1arUdu0N3OnMT4szdn2",
        },
        {
          url: "/_next/static/chunks/9498-a2add440b37a89f7.js",
          revision: "4t1arUdu0N3OnMT4szdn2",
        },
        {
          url: "/_next/static/chunks/962-6dd8b0820196fc50.js",
          revision: "4t1arUdu0N3OnMT4szdn2",
        },
        {
          url: "/_next/static/chunks/app/%5Blang%5D/(mods-pages)/(side-pages)/contribute/page-28c0a5df8e5f14da.js",
          revision: "4t1arUdu0N3OnMT4szdn2",
        },
        {
          url: "/_next/static/chunks/app/%5Blang%5D/(mods-pages)/(side-pages)/issues/page-f60b933d47232ed7.js",
          revision: "4t1arUdu0N3OnMT4szdn2",
        },
        {
          url: "/_next/static/chunks/app/%5Blang%5D/(mods-pages)/(side-pages)/next-steps/page-22b39729bc5314d7.js",
          revision: "4t1arUdu0N3OnMT4szdn2",
        },
        {
          url: "/_next/static/chunks/app/%5Blang%5D/(mods-pages)/(side-pages)/privacy-policy/page-496c2b7f377d0089.js",
          revision: "4t1arUdu0N3OnMT4szdn2",
        },
        {
          url: "/_next/static/chunks/app/%5Blang%5D/(mods-pages)/(side-pages)/proxy-login/page-ab6e4b411b7f8b93.js",
          revision: "4t1arUdu0N3OnMT4szdn2",
        },
        {
          url: "/_next/static/chunks/app/%5Blang%5D/(mods-pages)/(side-pages)/team/page-35114bccb9f1d10a.js",
          revision: "4t1arUdu0N3OnMT4szdn2",
        },
        {
          url: "/_next/static/chunks/app/%5Blang%5D/(mods-pages)/(side-pages)/web-for-beginners/auth/page-a4a9605e043572aa.js",
          revision: "4t1arUdu0N3OnMT4szdn2",
        },
        {
          url: "/_next/static/chunks/app/%5Blang%5D/(mods-pages)/(side-pages)/web-for-beginners/comments-dates/page-ee6fe55eb01f0da3.js",
          revision: "4t1arUdu0N3OnMT4szdn2",
        },
        {
          url: "/_next/static/chunks/app/%5Blang%5D/(mods-pages)/(side-pages)/web-for-beginners/course/page-d456c10b36dd6b44.js",
          revision: "4t1arUdu0N3OnMT4szdn2",
        },
        {
          url: "/_next/static/chunks/app/%5Blang%5D/(mods-pages)/(side-pages)/web-for-beginners/grades/page-99f741392743fa25.js",
          revision: "4t1arUdu0N3OnMT4szdn2",
        },
        {
          url: "/_next/static/chunks/app/%5Blang%5D/(mods-pages)/(side-pages)/web-for-beginners/misc/page-83b6368409f0baa9.js",
          revision: "4t1arUdu0N3OnMT4szdn2",
        },
        {
          url: "/_next/static/chunks/app/%5Blang%5D/(mods-pages)/(venues)/venues/@content/%5BlocationId%5D/page-34ce4f389d3a4466.js",
          revision: "4t1arUdu0N3OnMT4szdn2",
        },
        {
          url: "/_next/static/chunks/app/%5Blang%5D/(mods-pages)/(venues)/venues/@content/layout-ce01ad59e579e400.js",
          revision: "4t1arUdu0N3OnMT4szdn2",
        },
        {
          url: "/_next/static/chunks/app/%5Blang%5D/(mods-pages)/(venues)/venues/@content/page-13c6f9a07e9642aa.js",
          revision: "4t1arUdu0N3OnMT4szdn2",
        },
        {
          url: "/_next/static/chunks/app/%5Blang%5D/(mods-pages)/(venues)/venues/@sidebar/%5BlocationId%5D/page-d28a28dc8a8637d3.js",
          revision: "4t1arUdu0N3OnMT4szdn2",
        },
        {
          url: "/_next/static/chunks/app/%5Blang%5D/(mods-pages)/(venues)/venues/@sidebar/layout-afa3a9295c9788ce.js",
          revision: "4t1arUdu0N3OnMT4szdn2",
        },
        {
          url: "/_next/static/chunks/app/%5Blang%5D/(mods-pages)/(venues)/venues/@sidebar/page-be20535b633ad0a1.js",
          revision: "4t1arUdu0N3OnMT4szdn2",
        },
        {
          url: "/_next/static/chunks/app/%5Blang%5D/(mods-pages)/(venues)/venues/layout-fa9d2ea45b6af41e.js",
          revision: "4t1arUdu0N3OnMT4szdn2",
        },
        {
          url: "/_next/static/chunks/app/%5Blang%5D/(mods-pages)/(venues)/venues/page-c9061dc593b84299.js",
          revision: "4t1arUdu0N3OnMT4szdn2",
        },
        {
          url: "/_next/static/chunks/app/%5Blang%5D/(mods-pages)/@modal/(.)courses/%5BcourseId%5D/layout-6483c1fac1123aee.js",
          revision: "4t1arUdu0N3OnMT4szdn2",
        },
        {
          url: "/_next/static/chunks/app/%5Blang%5D/(mods-pages)/@modal/(.)courses/%5BcourseId%5D/loading-2e2cb0cc44c6c64b.js",
          revision: "4t1arUdu0N3OnMT4szdn2",
        },
        {
          url: "/_next/static/chunks/app/%5Blang%5D/(mods-pages)/@modal/(.)courses/%5BcourseId%5D/page-08a7491ca35a09f3.js",
          revision: "4t1arUdu0N3OnMT4szdn2",
        },
        {
          url: "/_next/static/chunks/app/%5Blang%5D/(mods-pages)/@modal/default-e920c1953eaf9298.js",
          revision: "4t1arUdu0N3OnMT4szdn2",
        },
        {
          url: "/_next/static/chunks/app/%5Blang%5D/(mods-pages)/@modal/loading-5d40192ffed4576c.js",
          revision: "4t1arUdu0N3OnMT4szdn2",
        },
        {
          url: "/_next/static/chunks/app/%5Blang%5D/(mods-pages)/apps/page-c3d6f1acca0acba9.js",
          revision: "4t1arUdu0N3OnMT4szdn2",
        },
        {
          url: "/_next/static/chunks/app/%5Blang%5D/(mods-pages)/bus/%5Broute%5D/%5Bline%5D/page-6656b4d43dda07d1.js",
          revision: "4t1arUdu0N3OnMT4szdn2",
        },
        {
          url: "/_next/static/chunks/app/%5Blang%5D/(mods-pages)/bus/%5Broute%5D/page-6724dfaa2f014d08.js",
          revision: "4t1arUdu0N3OnMT4szdn2",
        },
        {
          url: "/_next/static/chunks/app/%5Blang%5D/(mods-pages)/bus/layout-6e9b2254e9ce0709.js",
          revision: "4t1arUdu0N3OnMT4szdn2",
        },
        {
          url: "/_next/static/chunks/app/%5Blang%5D/(mods-pages)/bus/page-23e936714b411400.js",
          revision: "4t1arUdu0N3OnMT4szdn2",
        },
        {
          url: "/_next/static/chunks/app/%5Blang%5D/(mods-pages)/calendar/page-2dc9ba8b6fc3b0ab.js",
          revision: "4t1arUdu0N3OnMT4szdn2",
        },
        {
          url: "/_next/static/chunks/app/%5Blang%5D/(mods-pages)/courses/%5BcourseId%5D/loading-9e348568a62759c7.js",
          revision: "4t1arUdu0N3OnMT4szdn2",
        },
        {
          url: "/_next/static/chunks/app/%5Blang%5D/(mods-pages)/courses/%5BcourseId%5D/page-f96e78b05b7ddcb8.js",
          revision: "4t1arUdu0N3OnMT4szdn2",
        },
        {
          url: "/_next/static/chunks/app/%5Blang%5D/(mods-pages)/courses/layout-f096f304bd04c39d.js",
          revision: "4t1arUdu0N3OnMT4szdn2",
        },
        {
          url: "/_next/static/chunks/app/%5Blang%5D/(mods-pages)/courses/page-d3279e39fe706ad5.js",
          revision: "4t1arUdu0N3OnMT4szdn2",
        },
        {
          url: "/_next/static/chunks/app/%5Blang%5D/(mods-pages)/error-5878543a499386ed.js",
          revision: "4t1arUdu0N3OnMT4szdn2",
        },
        {
          url: "/_next/static/chunks/app/%5Blang%5D/(mods-pages)/layout-492a5d44f76fafd7.js",
          revision: "4t1arUdu0N3OnMT4szdn2",
        },
        {
          url: "/_next/static/chunks/app/%5Blang%5D/(mods-pages)/loading-9120bf06ef485675.js",
          revision: "4t1arUdu0N3OnMT4szdn2",
        },
        {
          url: "/_next/static/chunks/app/%5Blang%5D/(mods-pages)/not-found-b80feee3115860e9.js",
          revision: "4t1arUdu0N3OnMT4szdn2",
        },
        {
          url: "/_next/static/chunks/app/%5Blang%5D/(mods-pages)/offline/page-a81015666764b073.js",
          revision: "4t1arUdu0N3OnMT4szdn2",
        },
        {
          url: "/_next/static/chunks/app/%5Blang%5D/(mods-pages)/settings/layout-5f84072d35659104.js",
          revision: "4t1arUdu0N3OnMT4szdn2",
        },
        {
          url: "/_next/static/chunks/app/%5Blang%5D/(mods-pages)/settings/page-822168eb239ed27b.js",
          revision: "4t1arUdu0N3OnMT4szdn2",
        },
        {
          url: "/_next/static/chunks/app/%5Blang%5D/(mods-pages)/shops/layout-73df1c776cf5264b.js",
          revision: "4t1arUdu0N3OnMT4szdn2",
        },
        {
          url: "/_next/static/chunks/app/%5Blang%5D/(mods-pages)/shops/page-2f02876131a1bec5.js",
          revision: "4t1arUdu0N3OnMT4szdn2",
        },
        {
          url: "/_next/static/chunks/app/%5Blang%5D/(mods-pages)/student/grades/layout-0e386d6738d4f8ee.js",
          revision: "4t1arUdu0N3OnMT4szdn2",
        },
        {
          url: "/_next/static/chunks/app/%5Blang%5D/(mods-pages)/student/grades/page-26c41bcd4f2844e2.js",
          revision: "4t1arUdu0N3OnMT4szdn2",
        },
        {
          url: "/_next/static/chunks/app/%5Blang%5D/(mods-pages)/student/id/page-cf532bb5d3d7452a.js",
          revision: "4t1arUdu0N3OnMT4szdn2",
        },
        {
          url: "/_next/static/chunks/app/%5Blang%5D/(mods-pages)/student/parcel/page-81b02f31065df90a.js",
          revision: "4t1arUdu0N3OnMT4szdn2",
        },
        {
          url: "/_next/static/chunks/app/%5Blang%5D/(mods-pages)/student/planner/layout-44897d9e0f7d395b.js",
          revision: "4t1arUdu0N3OnMT4szdn2",
        },
        {
          url: "/_next/static/chunks/app/%5Blang%5D/(mods-pages)/student/planner/page-4d7b372ef85a4ddc.js",
          revision: "4t1arUdu0N3OnMT4szdn2",
        },
        {
          url: "/_next/static/chunks/app/%5Blang%5D/(mods-pages)/timetable/layout-e623285b4bc02676.js",
          revision: "4t1arUdu0N3OnMT4szdn2",
        },
        {
          url: "/_next/static/chunks/app/%5Blang%5D/(mods-pages)/timetable/page-0237ba572da48a85.js",
          revision: "4t1arUdu0N3OnMT4szdn2",
        },
        {
          url: "/_next/static/chunks/app/%5Blang%5D/(mods-pages)/timetable/view/page-a927ff3a35bc6bad.js",
          revision: "4t1arUdu0N3OnMT4szdn2",
        },
        {
          url: "/_next/static/chunks/app/%5Blang%5D/(mods-pages)/today/layout-74769e374d4c387f.js",
          revision: "4t1arUdu0N3OnMT4szdn2",
        },
        {
          url: "/_next/static/chunks/app/%5Blang%5D/(mods-pages)/today/page-991e5e115dc62b20.js",
          revision: "4t1arUdu0N3OnMT4szdn2",
        },
        {
          url: "/_next/static/chunks/app/%5Blang%5D/error-33f8f4e7e307a31e.js",
          revision: "4t1arUdu0N3OnMT4szdn2",
        },
        {
          url: "/_next/static/chunks/app/%5Blang%5D/layout-112953be1ad32225.js",
          revision: "4t1arUdu0N3OnMT4szdn2",
        },
        {
          url: "/_next/static/chunks/app/%5Blang%5D/loading-7826054bc8936ad7.js",
          revision: "4t1arUdu0N3OnMT4szdn2",
        },
        {
          url: "/_next/static/chunks/app/%5Blang%5D/not-found-1215d01684b229db.js",
          revision: "4t1arUdu0N3OnMT4szdn2",
        },
        {
          url: "/_next/static/chunks/app/%5Blang%5D/waitlist/layout-6385573c3bddd389.js",
          revision: "4t1arUdu0N3OnMT4szdn2",
        },
        {
          url: "/_next/static/chunks/app/%5Blang%5D/waitlist/page-2b08d50d661eb26c.js",
          revision: "4t1arUdu0N3OnMT4szdn2",
        },
        {
          url: "/_next/static/chunks/app/_not-found/page-b579f66463becd79.js",
          revision: "4t1arUdu0N3OnMT4szdn2",
        },
        {
          url: "/_next/static/chunks/app/auth/callback/page-97f8599c4ef2d598.js",
          revision: "4t1arUdu0N3OnMT4szdn2",
        },
        {
          url: "/_next/static/chunks/app/error-81c089b0fd9b47a3.js",
          revision: "4t1arUdu0N3OnMT4szdn2",
        },
        {
          url: "/_next/static/chunks/app/global-error-a3f8c1ba2de70b89.js",
          revision: "4t1arUdu0N3OnMT4szdn2",
        },
        {
          url: "/_next/static/chunks/app/layout-1e4b7467f4a7f62a.js",
          revision: "4t1arUdu0N3OnMT4szdn2",
        },
        {
          url: "/_next/static/chunks/e915c8b4.6c54f2b2b8d0bce2.js",
          revision: "6c54f2b2b8d0bce2",
        },
        {
          url: "/_next/static/chunks/framework-47e72bcf2de9ca68.js",
          revision: "4t1arUdu0N3OnMT4szdn2",
        },
        {
          url: "/_next/static/chunks/main-77639661b2c3de49.js",
          revision: "4t1arUdu0N3OnMT4szdn2",
        },
        {
          url: "/_next/static/chunks/main-app-469185434c4bf3c9.js",
          revision: "4t1arUdu0N3OnMT4szdn2",
        },
        {
          url: "/_next/static/chunks/pages/_app-a5036742f213a995.js",
          revision: "4t1arUdu0N3OnMT4szdn2",
        },
        {
          url: "/_next/static/chunks/pages/_error-c4bf9dbafd3912bc.js",
          revision: "4t1arUdu0N3OnMT4szdn2",
        },
        {
          url: "/_next/static/chunks/polyfills-42372ed130431b0a.js",
          revision: "846118c33b2c0e922d7b3a7676f81f6f",
        },
        {
          url: "/_next/static/chunks/webpack-c490095496e88771.js",
          revision: "4t1arUdu0N3OnMT4szdn2",
        },
        {
          url: "/_next/static/css/b8cb3f906e13d6d0.css",
          revision: "b8cb3f906e13d6d0",
        },
        {
          url: "/_next/static/css/bf9507bee53416b9.css",
          revision: "bf9507bee53416b9",
        },
        {
          url: "/_next/static/css/cac3e1617ceef12c.css",
          revision: "cac3e1617ceef12c",
        },
        {
          url: "/_next/static/css/d5405c502f99bce9.css",
          revision: "d5405c502f99bce9",
        },
        {
          url: "/_next/static/media/0069592785733b89-s.woff2",
          revision: "acb44cddac79050633e7fecca02a59f8",
        },
        {
          url: "/_next/static/media/015e7d7c23b3bd12-s.woff2",
          revision: "3e9ab50da22b9f1f9117db255765eeca",
        },
        {
          url: "/_next/static/media/01d21e5d1ca7acd5-s.woff2",
          revision: "d2ab80c4aaa9bbc28fde88077630f463",
        },
        {
          url: "/_next/static/media/032c4cd8ced67a7d-s.woff2",
          revision: "e0afcf1d48d04a8fd4207743956fd8fd",
        },
        {
          url: "/_next/static/media/04b8f7bc999fff12-s.woff2",
          revision: "01ea61fddba3beaa9b772c5df9b13bec",
        },
        {
          url: "/_next/static/media/04eec2cb2b910acc-s.woff2",
          revision: "a2b8fa84f9a085efc629dd94a2a6f7cb",
        },
        {
          url: "/_next/static/media/07a8ba11c02d35ce-s.woff2",
          revision: "dc4a110bf9274c3b514fe71d0ac770a6",
        },
        {
          url: "/_next/static/media/084d9bbab7ef04f4-s.woff2",
          revision: "342fff4805e87e07b6639850b7d63b71",
        },
        {
          url: "/_next/static/media/0ae742601bf489d6-s.woff2",
          revision: "0997f55d605b2c733a8ec7c825e63908",
        },
        {
          url: "/_next/static/media/0bd83365321e6a89-s.woff2",
          revision: "d46871ff0ceb432e768d542aa53d0d28",
        },
        {
          url: "/_next/static/media/0c620465bfaa1f8b-s.woff2",
          revision: "3e439d7ed785fd873d41fdbf126561ce",
        },
        {
          url: "/_next/static/media/11803253c52e89c4-s.woff2",
          revision: "75c4ef6cda3ee6242a727f309ce131f5",
        },
        {
          url: "/_next/static/media/1355f6e879b85c69-s.woff2",
          revision: "20487b62df09a4a54d632914ead0909d",
        },
        {
          url: "/_next/static/media/1499772619028a93-s.woff2",
          revision: "8141ba5e9b4c6dd8006baf10fb4d90f5",
        },
        {
          url: "/_next/static/media/17b4a488cc65cc28-s.woff2",
          revision: "bc8c82bedb5522e4e5fddee2c6742636",
        },
        {
          url: "/_next/static/media/17cf92c038d3704e-s.woff2",
          revision: "2342c51d823da4b2ecef60bd558e1580",
        },
        {
          url: "/_next/static/media/1917204e5ec16a68-s.woff2",
          revision: "07b93db7edc251ba4dbc8cb1e5d32a15",
        },
        {
          url: "/_next/static/media/1a0556a21a8acb97-s.woff2",
          revision: "47694123644f2a714bb3cdd55a5fb740",
        },
        {
          url: "/_next/static/media/1d1810a765b4e861-s.woff2",
          revision: "2d9c9096f4bee2656857401aa6293d9d",
        },
        {
          url: "/_next/static/media/1d9fc84996f763ca-s.woff2",
          revision: "1beddbfb8ea74083603865f967805c74",
        },
        {
          url: "/_next/static/media/1f34a49ca418f98d-s.woff2",
          revision: "6ffcfa035f952f26db989247ef3f1a87",
        },
        {
          url: "/_next/static/media/22a29e166c1ae227-s.woff2",
          revision: "c8885b3e804df7654da3b6fe14bfd245",
        },
        {
          url: "/_next/static/media/2355e80e29b79e65-s.woff2",
          revision: "c307145a3c9a763f90584f054021e62c",
        },
        {
          url: "/_next/static/media/2468a903d4ab0171-s.woff2",
          revision: "0bb43cab0b679e8fa4a6098900db7183",
        },
        {
          url: "/_next/static/media/257c95ef13c2c9b1-s.woff2",
          revision: "d5d94912bfd9f2d27387190d91a7a64e",
        },
        {
          url: "/_next/static/media/2635e5a9b69882eb-s.woff2",
          revision: "1f19d89050df2d4bc3006ce9fe6d7ae1",
        },
        {
          url: "/_next/static/media/26a46d62cd723877-s.woff2",
          revision: "befd9c0fdfa3d8a645d5f95717ed6420",
        },
        {
          url: "/_next/static/media/26e1724932d7fd12-s.woff2",
          revision: "5e71c2344ccdf43f1c5d0608ee08cb20",
        },
        {
          url: "/_next/static/media/26ea88c1da06b1cd-s.woff2",
          revision: "a947ccbfa28f78403c4ab77e1110562d",
        },
        {
          url: "/_next/static/media/2720c84f79a4110b-s.woff2",
          revision: "8d3c49822d7ffb3a8ab826e6dd30cc59",
        },
        {
          url: "/_next/static/media/2c82a100ef69bcd7-s.woff2",
          revision: "db17dd27610c669f8fe9931dad9ba15f",
        },
        {
          url: "/_next/static/media/314659c0d042d548-s.woff2",
          revision: "da4cc845366f458a89ea0a6a7a2eaaee",
        },
        {
          url: "/_next/static/media/3154d9660f3d9cc9-s.woff2",
          revision: "215bfb15f18cec64d7c74a69dd80bd2b",
        },
        {
          url: "/_next/static/media/365e397370a5d95b-s.woff2",
          revision: "f0b5f96c81c2442b7c52cebe69d5be0f",
        },
        {
          url: "/_next/static/media/39647b9bee358d87-s.woff2",
          revision: "a76fc662835b0201fbd92b9d7bf8bc22",
        },
        {
          url: "/_next/static/media/3a2ff43d40e5dda6-s.woff2",
          revision: "093cbaf86e8765f4343f53e07744160e",
        },
        {
          url: "/_next/static/media/3f0a6c2e93e04c40-s.woff2",
          revision: "f1ef51170170eb9b3d86af12127bfd03",
        },
        {
          url: "/_next/static/media/4345f4f4308c3fc9-s.woff2",
          revision: "c5ba6688bfcddd968231adf088831c3d",
        },
        {
          url: "/_next/static/media/448a182cec251bc2-s.woff2",
          revision: "94849b24c8af9a6fc07b190363251824",
        },
        {
          url: "/_next/static/media/44b1c5821d696667-s.woff2",
          revision: "188fcb9c1fc0dc402e930b81bb41b040",
        },
        {
          url: "/_next/static/media/44cd762c379afc35-s.woff2",
          revision: "ac57bc89b59ad177ba8b828af553c936",
        },
        {
          url: "/_next/static/media/4502c08493962bf8-s.woff2",
          revision: "df00d4b069d291c84e643d30e7fec5f3",
        },
        {
          url: "/_next/static/media/463fddf4d462f880-s.woff2",
          revision: "b09813b3ed84bd53513f215f21437459",
        },
        {
          url: "/_next/static/media/469e7ec4bc41ee79-s.woff2",
          revision: "f1c06e0188ca2a9523cc2bd8075c4e19",
        },
        {
          url: "/_next/static/media/493c3cff6f1bd7f1-s.p.woff2",
          revision: "ec1f18e3da3f5b796d80ef70eca97803",
        },
        {
          url: "/_next/static/media/49b0e36c6f99d9cb-s.woff2",
          revision: "cd8aa08bc56762a4720222d6e689d74b",
        },
        {
          url: "/_next/static/media/4a2be719e1306d14-s.woff2",
          revision: "4eee965984533f2cc8e7bdcb4010568c",
        },
        {
          url: "/_next/static/media/55c55f0601d81cf3-s.woff2",
          revision: "43828e14271c77b87e3ed582dbff9f74",
        },
        {
          url: "/_next/static/media/565affc01a8da79e-s.woff2",
          revision: "480873532172feffc6aba7799060dc1a",
        },
        {
          url: "/_next/static/media/57ff88a56c84ea98-s.woff2",
          revision: "71b986035511f89d9ed6df8ce6dbd54b",
        },
        {
          url: "/_next/static/media/581909926a08bbc8-s.woff2",
          revision: "f0b86e7c24f455280b8df606b89af891",
        },
        {
          url: "/_next/static/media/59097cab950cf195-s.woff2",
          revision: "53dabd2851f7bf61d0dde56f2d72a9e1",
        },
        {
          url: "/_next/static/media/598be2aade6cdd1f-s.woff2",
          revision: "e464874525156689045abb1a34478fbc",
        },
        {
          url: "/_next/static/media/5c9f071e0f86e2de-s.woff2",
          revision: "0c9bba2049383c13214f0ae94a1a7552",
        },
        {
          url: "/_next/static/media/60cb3136d8fd9222-s.woff2",
          revision: "165391693345293748bfcb4df4ca072c",
        },
        {
          url: "/_next/static/media/615703e55ecaa911-s.woff2",
          revision: "4a2684ae4bd75c8a56cd945c34790538",
        },
        {
          url: "/_next/static/media/620253ca22c18bcd-s.woff2",
          revision: "4c07f83ac759e4e2a3b3c65539d3e9c8",
        },
        {
          url: "/_next/static/media/6419eceac70a36ba-s.woff2",
          revision: "e4046b981f6723a367292e623d544690",
        },
        {
          url: "/_next/static/media/64ea964de6a05c60-s.woff2",
          revision: "2dfc10bed1832e6cd7a39132109a2b5f",
        },
        {
          url: "/_next/static/media/66712fbdf2a7d463-s.woff2",
          revision: "a3109e571fed2903502fbd455b999184",
        },
        {
          url: "/_next/static/media/66dfd3184cc932fb-s.woff2",
          revision: "1763ae9372499ec3de399f4845afd0a9",
        },
        {
          url: "/_next/static/media/671303dcd7e7b01d-s.woff2",
          revision: "3bf587a4906c27ab1678e792ff6fcfa5",
        },
        {
          url: "/_next/static/media/6a21ff9adbf32d14-s.woff2",
          revision: "9af8fd5671d031c8bd732728260ad0f6",
        },
        {
          url: "/_next/static/media/6a81107eda72ed26-s.woff2",
          revision: "2ada6fd7f69d485cc4e7f62e88783d59",
        },
        {
          url: "/_next/static/media/6b5a878fa3e4cc93-s.woff2",
          revision: "0f89357fb82b9b322a73c10c73216e3e",
        },
        {
          url: "/_next/static/media/6fc79671c544f60b-s.woff2",
          revision: "e34b687c4413c8c9835fbc0e20bec0e2",
        },
        {
          url: "/_next/static/media/704c4242096f4c58-s.woff2",
          revision: "ce1a0213945ecc5eaeec58c3a080077c",
        },
        {
          url: "/_next/static/media/7668a0f466d86b79-s.woff2",
          revision: "441a3200c217c2a0b400719965e63baf",
        },
        {
          url: "/_next/static/media/76751f4092d81a41-s.woff2",
          revision: "f4693578da5abe54f43588590e50ff6c",
        },
        {
          url: "/_next/static/media/793cd409a3709830-s.woff2",
          revision: "0cb0a8c859c1a113ff1c7d02bc6f7aa7",
        },
        {
          url: "/_next/static/media/7fcbfbcb2c08bd75-s.woff2",
          revision: "4b9a338f2a7d749f10a9e342dccdc864",
        },
        {
          url: "/_next/static/media/867c2382260cc4e3-s.woff2",
          revision: "335c6e35899e403ad6557af7a4807fd4",
        },
        {
          url: "/_next/static/media/8c9c21041113a703-s.woff2",
          revision: "eade1630665c73f4211a2e67641bdc92",
        },
        {
          url: "/_next/static/media/8e9860b6e62d6359-s.p.woff2",
          revision: "01ba6c2a184b8cba08b0d57167664d75",
        },
        {
          url: "/_next/static/media/8ee2391d3de87e13-s.woff2",
          revision: "afb5928c0647fb7773028c3c2a5436a8",
        },
        {
          url: "/_next/static/media/901e11ccc6508d29-s.woff2",
          revision: "d56de175b4b687a24e8565820936b26b",
        },
        {
          url: "/_next/static/media/91d4989f17a31630-s.woff2",
          revision: "75812cf5084d3ff200c4bd52a09d7bae",
        },
        {
          url: "/_next/static/media/946779903a799e7a-s.woff2",
          revision: "a2b42de383e1f78e74f9a49049c86e99",
        },
        {
          url: "/_next/static/media/95737c7f7c1a9009-s.woff2",
          revision: "381f5c95920c1dd65f81afda84573af1",
        },
        {
          url: "/_next/static/media/97e0cb1ae144a2a9-s.woff2",
          revision: "e360c61c5bd8d90639fd4503c829c2dc",
        },
        {
          url: "/_next/static/media/9a960c802fb4bd92-s.woff2",
          revision: "aa87baac97a056e12b9726db2955a7e9",
        },
        {
          url: "/_next/static/media/9aeb8cd1d32ae3e5-s.woff2",
          revision: "9c53bed273d4399381abb10571e9f7fb",
        },
        {
          url: "/_next/static/media/9e865369f01ee354-s.woff2",
          revision: "39957e751cc2433553f445e728de95b3",
        },
        {
          url: "/_next/static/media/a77558935c27fc1c-s.woff2",
          revision: "c3b72ecbfa7114a711bd7457b577960f",
        },
        {
          url: "/_next/static/media/a93bd4f34c60c5e7-s.woff2",
          revision: "dcdc4a60608adea5129b45993fd6dbdc",
        },
        {
          url: "/_next/static/media/aa861660d436c662-s.woff2",
          revision: "123de418c41771253423f60d9d3d9c8a",
        },
        {
          url: "/_next/static/media/aab5f6a3f057d43f-s.woff2",
          revision: "d9c61464666bd627bd9dfce8530c0103",
        },
        {
          url: "/_next/static/media/ab858d0b88dcd47a-s.woff2",
          revision: "ab34bf838009934d4efc0ea7ec47c7c0",
        },
        {
          url: "/_next/static/media/ae43398c10363f58-s.woff2",
          revision: "7a2a3e12f2d6317d6fd9565f9b6bdb8d",
        },
        {
          url: "/_next/static/media/aeb8137e662e3bc8-s.woff2",
          revision: "1ee3769d1ca45849cb0fce7224037b80",
        },
        {
          url: "/_next/static/media/b0eda4ac1801105e-s.woff2",
          revision: "f11df2a9091d7c37803339904db071c4",
        },
        {
          url: "/_next/static/media/b524d12c75f7dd2f-s.woff2",
          revision: "aa05529140cf755aeedcae642936adf3",
        },
        {
          url: "/_next/static/media/b5d8085db06244d5-s.woff2",
          revision: "b50ed4aa0d87c44302e53308ce8af000",
        },
        {
          url: "/_next/static/media/ba95c4185f9d9155-s.woff2",
          revision: "5a6b407e82abb9302f28f6c3009d8ade",
        },
        {
          url: "/_next/static/media/c01d908355bb2781-s.woff2",
          revision: "793c9b358bb3c815b5e4d0558aa62822",
        },
        {
          url: "/_next/static/media/c5a7bf215976acaa-s.woff2",
          revision: "83f12a957f054881d91efb83fe7b2081",
        },
        {
          url: "/_next/static/media/cd254060cae3aa51-s.woff2",
          revision: "4d14dde56a5a0d873cd8ebba1fbcb668",
        },
        {
          url: "/_next/static/media/d1e0ed9f35d7a445-s.p.woff2",
          revision: "0216fc4d4f2ef719189b030b08903b15",
        },
        {
          url: "/_next/static/media/d42b04f5a0f5e8b0-s.woff2",
          revision: "b6be95b27870e8a45746a6834eed4240",
        },
        {
          url: "/_next/static/media/d5a559e7b6d7f3f8-s.woff2",
          revision: "eaa647cb15b5dfbd1a822b789ffaf997",
        },
        {
          url: "/_next/static/media/d7e79f4414888431-s.woff2",
          revision: "4ebd8b8c4821265df65178503a4cbc5b",
        },
        {
          url: "/_next/static/media/d826c0fa784f81fa-s.woff2",
          revision: "c401c0b02c943691cdfd0f02746903aa",
        },
        {
          url: "/_next/static/media/dc676b586ea94218-s.woff2",
          revision: "19185fb2421307fcf93a98b5a7de741c",
        },
        {
          url: "/_next/static/media/df0a9ae256c0569c-s.woff2",
          revision: "d54db44de5ccb18886ece2fda72bdfe0",
        },
        {
          url: "/_next/static/media/e08862127614a8d6-s.woff2",
          revision: "21b994b958a8b02bb780c67e83f0d919",
        },
        {
          url: "/_next/static/media/e36d7835270abff8-s.woff2",
          revision: "1999ef57d37034febc4adfe1063cf8b7",
        },
        {
          url: "/_next/static/media/e4af272ccee01ff0-s.p.woff2",
          revision: "65850a373e258f1c897a2b3d75eb74de",
        },
        {
          url: "/_next/static/media/eb070247b8efe960-s.woff2",
          revision: "fd414b3172833f9b8ea35fdaba62f75f",
        },
        {
          url: "/_next/static/media/f38aef22c937b411-s.woff2",
          revision: "f882dbe48b11540963334bf23f92ab36",
        },
        {
          url: "/_next/static/media/f4ee3716f316abf8-s.woff2",
          revision: "1ebe5715d1e552f89e6f9f238873d63e",
        },
        {
          url: "/_next/static/media/f50d96cd86b27134-s.woff2",
          revision: "a9428c8fb0939aa005dc95ac9101fab5",
        },
        {
          url: "/_next/static/media/fa0dd21c7f1e1972-s.woff2",
          revision: "443d3e36b4506bb47cc6442a3d88ff0c",
        },
        {
          url: "/fallback-ce627215c0e4a9af.js",
          revision: "fecc9db7a81eceac2b8896a308677977",
        },
        {
          url: "/fallback_data/bus/all_weekday_down.json",
          revision: "00c0627aeda7840507e8bb92ca3edcea",
        },
        {
          url: "/fallback_data/bus/all_weekday_up.json",
          revision: "ce437e329d0be978989d93261be19312",
        },
        {
          url: "/fallback_data/bus/all_weekend_down.json",
          revision: "0cdef3b6b950bce78c2f894553b59775",
        },
        {
          url: "/fallback_data/bus/all_weekend_up.json",
          revision: "f29eb5c8878a72d5df5cf039293c6938",
        },
        {
          url: "/fallback_data/bus/main.json",
          revision: "47982d9127b8e8afe974382db6109da4",
        },
        {
          url: "/fallback_data/bus/nanda.json",
          revision: "810eb08e22b1da0da11fec088d19742f",
        },
        {
          url: "/fonts/Inter-VariableFont_slnt,wght.ttf",
          revision: "32204736a4290ec41200abe91e5190d1",
        },
        {
          url: "/fonts/InterVariable.woff2",
          revision: "499fcada6ddb2c38718c2c16a190d639",
        },
        {
          url: "/fonts/SourceHanSansTW-VF.otf",
          revision: "189ded9032ba0d2b75ad946b6ba091f8",
        },
        {
          url: "/fonts/SourceHanSansTW-VF.ttf",
          revision: "b050bdb5bdcd8244038282aef39c6a55",
        },
        {
          url: "/images/Algolia-mark-blue.png",
          revision: "b8722bd444d3cfbb4a88be50f77d70e6",
        },
        {
          url: "/images/cerana_dc.png",
          revision: "65773079a439e7aa23c2365494e5bf21",
        },
        {
          url: "/images/icons/icon-128x128.png",
          revision: "78bda930abec15d1cffd4063d27dc9da",
        },
        {
          url: "/images/icons/icon-144x144.png",
          revision: "d7591be043be4f52a06022e71b9d197a",
        },
        {
          url: "/images/icons/icon-152x152.png",
          revision: "71638c6670ae0660fc1e2bac9531c74e",
        },
        {
          url: "/images/icons/icon-192x192.png",
          revision: "19daefd5e1aa78aa31f37b8991a13a8f",
        },
        {
          url: "/images/icons/icon-384x384.png",
          revision: "aae03b0f9e42021ea6c8f9dce29fcba3",
        },
        {
          url: "/images/icons/icon-512x512.png",
          revision: "7acb967a678becd792feb554c45cb8ff",
        },
        {
          url: "/images/icons/icon-72x72.png",
          revision: "ca0d71d4f678d05210f78ac9a8de60b3",
        },
        {
          url: "/images/icons/icon-96x96.png",
          revision: "a933b4714b08e2056cc3d668be189b40",
        },
        {
          url: "/marker-icon.png",
          revision: "2273e3d8ad9264b7daa5bdbf8e6b47f8",
        },
        { url: "/sitemap.xml", revision: "e003fdba61b3aac4ac6556aa647bf9ae" },
        { url: "/zh/offline", revision: "4t1arUdu0N3OnMT4szdn2" },
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
          {
            handlerDidError: async ({ request: e }) =>
              "undefined" != typeof self ? self.fallback(e) : Response.error(),
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
          {
            handlerDidError: async ({ request: e }) =>
              "undefined" != typeof self ? self.fallback(e) : Response.error(),
          },
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
          {
            handlerDidError: async ({ request: e }) =>
              "undefined" != typeof self ? self.fallback(e) : Response.error(),
          },
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
          {
            handlerDidError: async ({ request: e }) =>
              "undefined" != typeof self ? self.fallback(e) : Response.error(),
          },
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
          {
            handlerDidError: async ({ request: e }) =>
              "undefined" != typeof self ? self.fallback(e) : Response.error(),
          },
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
          {
            handlerDidError: async ({ request: e }) =>
              "undefined" != typeof self ? self.fallback(e) : Response.error(),
          },
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
          {
            handlerDidError: async ({ request: e }) =>
              "undefined" != typeof self ? self.fallback(e) : Response.error(),
          },
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
          {
            handlerDidError: async ({ request: e }) =>
              "undefined" != typeof self ? self.fallback(e) : Response.error(),
          },
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
          {
            handlerDidError: async ({ request: e }) =>
              "undefined" != typeof self ? self.fallback(e) : Response.error(),
          },
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
          {
            handlerDidError: async ({ request: e }) =>
              "undefined" != typeof self ? self.fallback(e) : Response.error(),
          },
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
          {
            handlerDidError: async ({ request: e }) =>
              "undefined" != typeof self ? self.fallback(e) : Response.error(),
          },
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
          {
            handlerDidError: async ({ request: e }) =>
              "undefined" != typeof self ? self.fallback(e) : Response.error(),
          },
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
          {
            handlerDidError: async ({ request: e }) =>
              "undefined" != typeof self ? self.fallback(e) : Response.error(),
          },
        ],
      }),
      "GET",
    ),
    e.registerRoute(
      ({ sameOrigin: e, url: { pathname: a } }) =>
        !(!e || a.startsWith("/api/auth/callback") || !a.startsWith("/api/")),
      new e.NetworkFirst({
        cacheName: "apis",
        networkTimeoutSeconds: 10,
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 16, maxAgeSeconds: 86400 }),
          {
            handlerDidError: async ({ request: e }) =>
              "undefined" != typeof self ? self.fallback(e) : Response.error(),
          },
        ],
      }),
      "GET",
    ),
    e.registerRoute(
      ({ request: e, url: { pathname: a }, sameOrigin: s }) =>
        "1" === e.headers.get("RSC") &&
        "1" === e.headers.get("Next-Router-Prefetch") &&
        s &&
        !a.startsWith("/api/"),
      new e.NetworkFirst({
        cacheName: "pages-rsc-prefetch",
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
          {
            handlerDidError: async ({ request: e }) =>
              "undefined" != typeof self ? self.fallback(e) : Response.error(),
          },
        ],
      }),
      "GET",
    ),
    e.registerRoute(
      ({ request: e, url: { pathname: a }, sameOrigin: s }) =>
        "1" === e.headers.get("RSC") && s && !a.startsWith("/api/"),
      new e.NetworkFirst({
        cacheName: "pages-rsc",
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
          {
            handlerDidError: async ({ request: e }) =>
              "undefined" != typeof self ? self.fallback(e) : Response.error(),
          },
        ],
      }),
      "GET",
    ),
    e.registerRoute(
      ({ url: { pathname: e }, sameOrigin: a }) => a && !e.startsWith("/api/"),
      new e.NetworkFirst({
        cacheName: "pages",
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
          {
            handlerDidError: async ({ request: e }) =>
              "undefined" != typeof self ? self.fallback(e) : Response.error(),
          },
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
          {
            handlerDidError: async ({ request: e }) =>
              "undefined" != typeof self ? self.fallback(e) : Response.error(),
          },
        ],
      }),
      "GET",
    ),
    (self.__WB_DISABLE_DEV_LOGS = !0);
});
//# sourceMappingURL=sw.js.map
