// Runs in the page world of the Local Logic frame that draws the map beside a
// Centris listing, and exists for one reason: that map is MapLibre, which
// paints the whole world into a WebGL canvas. Every other map the extension
// draws on states its projection in the DOM — a raster tile whose URL carries
// the column, row and zoom its box is showing — and this one states nothing
// at all. So unlike the others, it has to be asked.
//
// What crosses between the two worlds is one attribute on <html>, which they
// share and nothing else. content.js writes the coordinates it wants
// projected; this writes back where they landed and at what zoom, every time
// the map moves. Neither script can see the other's variables, which is why
// the two attribute names are spelled out again here.
(() => {
  const ANCHOR_ATTRIBUTE = "data-stm-anchor";
  const CAMERA_ATTRIBUTE = "data-stm-camera";
  // The class MapLibre puts on the element it was handed, from the moment the
  // map initialises.
  const MAP_SELECTOR = ".maplibregl-map";
  // React's own key for the fiber it hangs off a rendered node. The suffix is
  // random per copy of React, so only the prefix can be named.
  const FIBER_KEY = "__reactFiber$";
  // How far up the tree from the map container to look, and how many hooks to
  // offer per component on the way. Both are well past where the map is
  // actually kept; what they are for is making sure that a widget rebuilt
  // around some other shape ends in a shrug rather than in a walk of the
  // whole page.
  const FIBER_DEPTH = 30;
  const HOOK_LIMIT = 60;
  // Everything MapLibre announces that moves the map under the overlay.
  // "move" alone covers a drag and every frame of an animation, but a resize
  // recentres the map without moving the camera at all, and "remove" is a map
  // saying it has stopped being one.
  const MAP_EVENTS = [
    "move",
    "moveend",
    "zoom",
    "rotate",
    "pitch",
    "resize",
    "remove"
  ];
  // Bearing and pitch in degrees, close enough to zero that the difference is
  // float noise from an animation that has settled rather than a map the user
  // has actually turned.
  const LEVEL_EPSILON = 0.01;
  // MapLibre counts zoom in 512 pixel tiles, which is the vector tile
  // convention, while the extension counts it in the 256 pixel tiles of the
  // nominal Web Mercator grid — the same as Leaflet, and the same as what
  // Google serves. One level of the first is two of the second, so what is
  // published here is the zoom the rest of the extension means rather than
  // the number MapLibre keeps.
  const TILE_ZOOM_OFFSET = 1;

  const root = document.documentElement;
  let anchor;
  let map;
  let watch;
  let watchRequest;

  // The map is only ever taken to be a map because it answers like one. What
  // the widget calls it, where it keeps it and which library built it are all
  // the SDK's to change; that a map projects coordinates and reports its zoom
  // is not.
  function looksLikeMap(value) {
    return (
      Boolean(value) &&
      typeof value === "object" &&
      typeof value.project === "function" &&
      typeof value.getZoom === "function" &&
      typeof value.getBearing === "function" &&
      typeof value.getPitch === "function" &&
      typeof value.getCanvas === "function" &&
      typeof value.on === "function" &&
      typeof value.off === "function"
    );
  }

  // A map that has been removed leaves its container behind but takes the
  // canvas out of it, and a container the widget has thrown away is gone from
  // the document altogether. Either way what is left is not a map any more,
  // and one reading catches both.
  function isGone() {
    return !map.getCanvas()?.isConnected;
  }

  // The widget is a React tree, and the map instance lives in a hook on one
  // of the components above the container rather than anywhere on the DOM.
  // Rather than name that shape, every hook on the way up is offered to
  // looksLikeMap(), and the first thing that answers to a map is the map.
  function mapFrom(container) {
    const key = Object.keys(container).find((name) =>
      name.startsWith(FIBER_KEY)
    );

    if (!key) return undefined;

    let fiber = container[key];

    for (let depth = 0; fiber && depth < FIBER_DEPTH; depth += 1) {
      let hook = fiber.memoizedState;

      for (let index = 0; hook && index < HOOK_LIMIT; index += 1) {
        const state = hook.memoizedState;

        // State holds its value outright, a ref holds it under current, and
        // the map itself may be wrapped in a helper of the wrapper's own.
        for (const candidate of [
          state,
          state?.current,
          state?.map,
          state?._map,
          state?.current?.map,
          state?.current?._map
        ]) {
          if (looksLikeMap(candidate)) return candidate;
        }

        hook = hook.next;
      }

      // A context provider carries the map as a prop instead of a hook.
      const value = fiber.memoizedProps?.value;

      for (const candidate of [value, value?.map, value?.current?.map]) {
        if (looksLikeMap(candidate)) return candidate;
      }

      fiber = fiber.return;
    }

    return undefined;
  }

  function isFlat() {
    // MapLibre 5 can draw the world as a globe, which is not a projection a
    // scale and a translate can follow. A build old enough to have no
    // getProjection() at all is Mercator by definition.
    const type = map.getProjection?.()?.type;

    return type === undefined || type === "mercator";
  }

  function publish() {
    if (!map || !anchor) return;

    // Reported to us as a removal, or noticed by the watch below. Either way
    // there is nothing left to project, and the last projection has to come
    // off the document rather than stand there as an answer about a map that
    // no longer exists.
    if (isGone()) {
      release();
      return;
    }

    const point = map.project(anchor);
    const zoom = map.getZoom() + TILE_ZOOM_OFFSET;

    if (
      !Number.isFinite(point?.x) ||
      !Number.isFinite(point?.y) ||
      !Number.isFinite(zoom)
    ) {
      return;
    }

    // A map that has been turned or tilted is not something the overlay can
    // be drawn onto, and saying so plainly is better than handing over a
    // projection that does not hold: the network is hidden until the map
    // comes back level rather than drawn somewhere it is not.
    const level =
      Math.abs(map.getBearing()) < LEVEL_EPSILON &&
      Math.abs(map.getPitch()) < LEVEL_EPSILON &&
      isFlat();

    // The zoom is written out far past what a reading of it is worth on its
    // own. The other side does not only scale the network by it: the anchor it
    // asks about is a fixed coordinate belonging to no city, so it also steps
    // from there to wherever the city it is drawing keeps its own origin, and
    // that step is millions of pixels long at these zooms. Rounding the zoom
    // to six places would land the whole network a pixel or so off the streets
    // it is supposed to sit on, and several pixels off when zoomed in.
    root.setAttribute(
      CAMERA_ATTRIBUTE,
      `${point.x.toFixed(2)} ${point.y.toFixed(2)} ${zoom.toFixed(10)} ${
        level ? 1 : 0
      }`
    );
  }

  // Everything here reaches into a library this script does not own, so a
  // release of it that renames something under us has to end in a bridge that
  // has let go rather than one that throws on every frame the map moves.
  // Letting go is also what recovers when the thing that threw was a map being
  // torn down mid-flight: the watch below picks up whatever replaces it.
  function report() {
    try {
      publish();
    } catch {
      release();
    }
  }

  function bind(next) {
    map = next;

    for (const name of MAP_EVENTS) map.on(name, report);

    report();
  }

  function release() {
    if (!map) return;

    try {
      for (const name of MAP_EVENTS) map.off(name, report);
    } catch {
      // A map that has already been destroyed has nothing left to say.
    }

    map = undefined;
    root.removeAttribute(CAMERA_ATTRIBUTE);
  }

  function findMap() {
    for (const container of document.querySelectorAll(MAP_SELECTOR)) {
      const found = mapFrom(container);

      if (found) {
        bind(found);
        return;
      }
    }
  }

  // Whatever the frame turned out to contain this time: a map where there was
  // none, or nothing where there was a map. A map that has been thrown away
  // says so through "remove" and is let go of there, but a map whose container
  // is simply unmounted says nothing at all, and then this is the only thing
  // that notices.
  function inspect() {
    if (map && isGone()) release();
    if (!map) findMap();
  }

  function stopWatch() {
    watch?.disconnect();
    cancelAnimationFrame(watchRequest);
    watch = undefined;
    watchRequest = undefined;
  }

  // The map lands some way into the widget's own loading, and the widget
  // rewrites its panels constantly both before that and after. One look per
  // frame, rather than one per mutation, is what keeps watching for it cheap
  // enough to go on doing for as long as the frame is open.
  function startWatch() {
    if (!anchor || watch) return;

    inspect();

    watch = new MutationObserver(() => {
      watchRequest ??= requestAnimationFrame(() => {
        watchRequest = undefined;
        inspect();
      });
    });
    watch.observe(root, { childList: true, subtree: true });
  }

  function readAnchor() {
    const value = root.getAttribute(ANCHOR_ATTRIBUTE);

    if (!value) return undefined;

    const [longitude, latitude] = value.split(" ").map(Number);

    if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
      return undefined;
    }

    return { lat: latitude, lng: longitude };
  }

  function syncAnchor() {
    const next = readAnchor();

    if (!next) {
      // No anchor means the extension is switched off, or switched off for
      // this site, or that the frame was never Centris' to begin with.
      // Nothing here runs again until one is written.
      stopWatch();
      release();
      anchor = undefined;
      return;
    }

    if (anchor && next.lat === anchor.lat && next.lng === anchor.lng) return;

    anchor = next;

    if (map) report();
    else startWatch();
  }

  new MutationObserver(syncAnchor).observe(root, {
    attributeFilter: [ANCHOR_ATTRIBUTE],
    attributes: true
  });

  syncAnchor();
})();
