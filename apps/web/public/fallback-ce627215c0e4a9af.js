self.fallback = async (e) => {
  let { destination: a, url: n } = e,
    o = { document: "/zh/offline", image: !1, audio: !1, video: !1, font: !1 }[
      a
    ];
  return o ? caches.match(o, { ignoreSearch: !0 }) : Response.error();
};
