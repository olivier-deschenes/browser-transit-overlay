// Which stations get their name written on the map, and on which side of the
// dot. A name keeps one size on screen while the gaps between stations grow
// and shrink with the zoom, so on a zoomed-out Paris hundreds of them compete
// for the same few pixels. Written at the same corner of every dot, the way
// they used to be, they piled into one another until none could be read.
// Each is offered a few places around its dot instead, takes the first that
// nothing else is in, and is left off where there is none.
//
// Nothing here touches the page. content.js says where the stations are, in
// pixels at the zoom being drawn, and how wide each name is, then draws what
// comes back. The same stations at the same zoom always come back the same
// way, which is what keeps a map being panned from reshuffling its names.
//
// A zoom is the exception, and only while it lasts. Laid out afresh on every
// frame of one, names that barely moved could land on a different side of
// their dots each time, and the whole map shimmered until the zoom ended.
// While the map is moving, a name either stays exactly where it is or goes,
// and the layout proper waits until the zoom has come to rest.

// A station's dot out to the edge of its outline: content.js draws a circle
// of radius 4.5 with a 2px stroke. No name is written over a dot, its own or
// any other station's.
const STM_STATION_DOT_RADIUS = 5.5;

// How far a name reaches from its baseline, set the way content.js sets it:
// 11px Arial rises about 10px, accents on capitals included, and drops about
// 2.5px, and every letter is haloed 1.5px deep on all sides.
const STM_LABEL_HALO = 1.5;
const STM_LABEL_ASCENT = 10 + STM_LABEL_HALO;
const STM_LABEL_DESCENT = 2.5 + STM_LABEL_HALO;

// Clear space kept around every name, so two names side by side never read
// as one.
const STM_LABEL_PADDING = 1;

// The places a name is offered, best first, each as the offset from the
// station to the text's anchor and baseline. Up and to the right comes first
// because that is where every name went before there was a choice, so a
// station with room to spare looks exactly as it always has. Then the other
// diagonals, then level with the dot, and last centred above and below it.
const STM_LABEL_SLOTS = [
  { anchor: "start", dx: 8, dy: -8 },
  { anchor: "end", dx: -8, dy: -8 },
  { anchor: "start", dx: 8, dy: 16 },
  { anchor: "end", dx: -8, dy: 16 },
  { anchor: "start", dx: 10, dy: 4 },
  { anchor: "end", dx: -10, dy: 4 },
  { anchor: "middle", dx: 0, dy: -10 },
  { anchor: "middle", dx: 0, dy: 18 }
];

// Space already taken is filed by the cells of a coarse grid, so a name is
// only checked against its neighbours rather than against every name in the
// city. The layout is made again on every frame of a zoom.
const STM_LABEL_CELL = 64;

// The box a name takes up in one of the slots, halo and padding included.
function stmLabelBox({ anchor, dx, dy }, x, y, width) {
  const start =
    x + dx - (anchor === "end" ? width : anchor === "middle" ? width / 2 : 0);
  const baseline = y + dy;
  const margin = STM_LABEL_HALO + STM_LABEL_PADDING;

  return {
    bottom: baseline + STM_LABEL_DESCENT + STM_LABEL_PADDING,
    left: start - margin,
    right: start + width + margin,
    top: baseline - STM_LABEL_ASCENT - STM_LABEL_PADDING
  };
}

// The stations come in as { name, nameWidth, rank, slot, x, y }, where rank is
// how many of the lines drawn stop there, slot is where the name was written
// by the layout before this one, if anywhere, and x and y are pixels at the
// current zoom, measured from any origin. What goes back is, for each station
// in the same order, the slot its name is written in, or nothing where there
// is no room for it.
//
// A map that is moving keeps each name in the slot it already has, for as
// long as that slot stays clear, and takes it off the map once it does not.
// No name moves or appears until the map is still again, so a zoom can only
// ever take names away, and each one at most once.
function stmPlaceStationLabels(stations, moving = false) {
  const cells = new Map();

  // The cells a box reaches into. Keys are numbers rather than strings, which
  // halves the time a layout takes. Two cells that happen to share a key, one
  // 4096 rows under the other, cost a few extra comparisons and never a wrong
  // answer, since every box found in a cell is still checked exactly.
  function cellKeys({ bottom, left, right, top }) {
    const keys = [];
    const lastColumn = Math.floor(right / STM_LABEL_CELL);
    const firstRow = Math.floor(top / STM_LABEL_CELL);
    const lastRow = Math.floor(bottom / STM_LABEL_CELL);

    for (
      let column = Math.floor(left / STM_LABEL_CELL);
      column <= lastColumn;
      column++
    ) {
      for (let row = firstRow; row <= lastRow; row++) {
        keys.push(column * 4096 + row);
      }
    }

    return keys;
  }

  function take(box) {
    for (const key of cellKeys(box)) {
      const cell = cells.get(key);

      if (cell) cell.push(box);
      else cells.set(key, [box]);
    }
  }

  // The station's own dot never counts against its name: every slot already
  // keeps clear of it, and only the padding could say otherwise.
  function isFree(box, owner) {
    for (const key of cellKeys(box)) {
      for (const taken of cells.get(key) ?? []) {
        if (
          taken.owner !== owner &&
          taken.left < box.right &&
          box.left < taken.right &&
          taken.top < box.bottom &&
          box.top < taken.bottom
        ) {
          return false;
        }
      }
    }

    return true;
  }

  // Every dot is taken before any name is, so a name placed early can never
  // cover a station whose own name comes later or not at all.
  stations.forEach(({ x, y }, owner) => {
    take({
      bottom: y + STM_STATION_DOT_RADIUS,
      left: x - STM_STATION_DOT_RADIUS,
      owner,
      right: x + STM_STATION_DOT_RADIUS,
      top: y - STM_STATION_DOT_RADIUS
    });
  });

  // Where only some of the names fit, the stations more lines stop at are
  // named first, since those are where riders change trains. Equals keep the
  // order they came in, so nothing but the stations decides the answer.
  const order = [...stations.keys()].sort(
    (a, b) => stations[b].rank - stations[a].rank
  );
  const written = new Map();
  const slots = stations.map(() => undefined);

  for (const index of order) {
    const { name, nameWidth, slot: kept, x, y } = stations[index];
    const namesakes = written.get(name) ?? [];

    // Two stations of one name a few steps apart, like the métro and the REM
    // at Édouard-Montpetit, are one place to whoever is reading the map. A
    // name already written closer than its own length is not written again.
    if (
      namesakes.some(
        ([otherX, otherY]) => Math.hypot(otherX - x, otherY - y) < nameWidth
      )
    ) {
      continue;
    }

    const offered = moving ? (kept ? [kept] : []) : STM_LABEL_SLOTS;

    for (const slot of offered) {
      const box = stmLabelBox(slot, x, y, nameWidth);

      if (!isFree(box, index)) continue;

      box.owner = index;
      take(box);
      slots[index] = slot;
      written.set(name, [...namesakes, [x, y]]);
      break;
    }
  }

  return slots;
}
