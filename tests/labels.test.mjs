import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const root = new URL('../extension/', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8');

const context = vm.createContext({});
vm.runInContext(read('labels.js'), context);
const { STM_LABEL_PADDING, STM_LABEL_SLOTS, STM_STATION_DOT_RADIUS, stmLabelBox, stmPlaceStationLabels } = vm.runInContext(
  '({ STM_LABEL_PADDING, STM_LABEL_SLOTS, STM_STATION_DOT_RADIUS, stmLabelBox, stmPlaceStationLabels })',
  context
);

const overlaps = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
const dot = ({ x, y }) => ({
  bottom: y + STM_STATION_DOT_RADIUS,
  left: x - STM_STATION_DOT_RADIUS,
  right: x + STM_STATION_DOT_RADIUS,
  top: y - STM_STATION_DOT_RADIUS
});

// Web Mercator in pixels at a zoom level, the way content.js projects the
// stations before handing them over.
function project([longitude, latitude], zoom) {
  const scale = 256 * 2 ** zoom;
  const sine = Math.sin((latitude * Math.PI) / 180);
  return [((longitude + 180) / 360) * scale, (0.5 - Math.log((1 + sine) / (1 - sine)) / (4 * Math.PI)) * scale];
}

test('a station with room to spare keeps its name up and to the right', () => {
  const [slot] = stmPlaceStationLabels([{ name: 'Berri-UQAM', nameWidth: 62, rank: 3, x: 120, y: 80 }]);
  assert.equal(slot, STM_LABEL_SLOTS[0]);
  assert.equal(slot.anchor, 'start');
  assert.equal(slot.dx, 8);
  assert.equal(slot.dy, -8);
});

// Every slot is measured from the dot outwards, so none of them can put a
// name over the station it names, whatever the name's length.
test('no slot writes a name over its own station', () => {
  for (const slot of STM_LABEL_SLOTS) {
    for (const width of [1, 40, 300]) {
      const box = stmLabelBox(slot, 0, 0, width);
      // The letters and their halo, without the clear space kept around them.
      const nearestX = Math.max(box.left + STM_LABEL_PADDING, Math.min(0, box.right - STM_LABEL_PADDING));
      const nearestY = Math.max(box.top + STM_LABEL_PADDING, Math.min(0, box.bottom - STM_LABEL_PADDING));
      assert.ok(Math.hypot(nearestX, nearestY) > STM_STATION_DOT_RADIUS, JSON.stringify(slot));
    }
  }
});

// Two stations in the same spot both want its best place, and whichever is
// placed first takes it.
test('the station more lines stop at is named first', () => {
  const slotsFor = (firstRank, secondRank) =>
    stmPlaceStationLabels([
      { name: 'Single', nameWidth: 40, rank: firstRank, x: 0, y: 0 },
      { name: 'Transfer', nameWidth: 40, rank: secondRank, x: 0, y: 0 }
    ]).map((slot) => STM_LABEL_SLOTS.indexOf(slot));

  const [single, transfer] = slotsFor(1, 3);
  assert.ok(transfer >= 0 && single > transfer, `${single} ${transfer}`);

  // Among equals, the order the stations came in decides, and nothing else.
  const [first, second] = slotsFor(2, 2);
  assert.ok(first >= 0 && second > first, `${first} ${second}`);
});

test('a name is written once for namesakes close together, and for each when they are far apart', () => {
  const namedAt = (distance) =>
    stmPlaceStationLabels([
      { name: 'McGill', nameWidth: 40, rank: 1, x: 0, y: 0 },
      { name: 'McGill', nameWidth: 40, rank: 1, x: distance, y: 0 }
    ]).filter(Boolean).length;

  assert.equal(namedAt(20), 1);
  assert.equal(namedAt(200), 2);
});

test('a name with nowhere to go is left off rather than written over other stations', () => {
  // A transfer station ringed by eight others, close enough that every place
  // around it lands on one of their dots. It is first in line and still goes
  // unnamed, rather than hide a station to make room for itself.
  const ring = [...Array(8).keys()].map((step) => {
    const angle = (step * Math.PI) / 4;
    return { name: `Ring ${step}`, nameWidth: 40, rank: 1, x: 14 * Math.cos(angle), y: 14 * Math.sin(angle) };
  });
  const [hub, ...others] = stmPlaceStationLabels([{ name: 'Hub', nameWidth: 40, rank: 5, x: 0, y: 0 }, ...ring]);
  assert.equal(hub, undefined);
  assert.ok(others.some(Boolean));
});

test('while the map is moving, a name keeps its place or goes, and none appears', () => {
  const lone = { name: 'Berri-UQAM', nameWidth: 62, rank: 3, x: 120, y: 80 };

  // Room on every side, and still the name stays below its dot, where the
  // last layout put it, until the map has stopped.
  assert.equal(stmPlaceStationLabels([{ ...lone, slot: STM_LABEL_SLOTS[2] }], true)[0], STM_LABEL_SLOTS[2]);
  assert.equal(stmPlaceStationLabels([{ ...lone, slot: STM_LABEL_SLOTS[2] }])[0], STM_LABEL_SLOTS[0]);

  // A station that was not named is not named until then either.
  assert.equal(stmPlaceStationLabels([lone], true)[0], undefined);

  // A neighbour's dot lands on the name's place, and the name goes rather
  // than moving round to the free side it takes once the map is still.
  const crowded = [
    { ...lone, slot: STM_LABEL_SLOTS[0] },
    { name: 'Neighbour', nameWidth: 50, rank: 1, x: 150, y: 76 }
  ];
  assert.equal(stmPlaceStationLabels(crowded, true)[0], undefined);
  assert.equal(stmPlaceStationLabels(crowded)[0], STM_LABEL_SLOTS[1]);
});

// The bundled networks at every zoom names are shown at, Paris's five hundred
// stations included. There is no canvas here to measure names with, so each
// letter is taken to be about as wide as 11px bold Arial makes it.
const networks = readdirSync(new URL('networks/', root)).map((file) => ({
  file,
  stations: JSON.parse(read(`networks/${file}`)).stations.map(({ coordinates, lines, name }) => ({
    coordinates,
    name,
    nameWidth: name.length * 6.5,
    rank: lines.length
  }))
}));

function atZoom(stations, zoom) {
  for (const station of stations) [station.x, station.y] = project(station.coordinates, zoom);
  return stations;
}

function assertClear(placed, slots, where) {
  const boxes = [];

  slots.forEach((slot, index) => {
    if (!slot) return;
    const { nameWidth, x, y } = placed[index];
    boxes.push({ ...stmLabelBox(slot, x, y, nameWidth), index });
  });

  // Hundreds of thousands of pairs on Paris, so a message is only written for
  // the one that fails.
  const dots = placed.map(dot);

  for (const [position, box] of boxes.entries()) {
    const { name } = placed[box.index];

    for (const other of boxes.slice(position + 1)) {
      if (overlaps(box, other)) assert.fail(`${where}: ${name} over ${placed[other.index].name}`);
    }

    for (const [index, station] of placed.entries()) {
      if (index !== box.index && overlaps(box, dots[index])) assert.fail(`${where}: ${name} over the dot of ${station.name}`);
    }
  }

  return boxes.length;
}

test('on every network, names never cover one another or another station', () => {
  for (const { file, stations } of networks) {
    for (const zoom of [13, 14, 15, 16, 17, 18]) {
      const placed = atZoom(stations, zoom);
      assert.ok(assertClear(placed, stmPlaceStationLabels(placed), `${file} at zoom ${zoom}`) > 0, `${file} at zoom ${zoom}`);
    }
  }
});

// A whole level of zoom in each direction, in the steps an animated zoom is
// drawn in. Every step only keeps or drops what the step before had, never
// covers anything, and the map at rest is the map a fresh layout would draw.
test('on every network, a zoom only takes names away until it stops', () => {
  for (const { file, stations } of networks) {
    for (const [from, to] of [
      [14, 13],
      [13, 14],
      [16, 15]
    ]) {
      stmPlaceStationLabels(atZoom(stations, from)).forEach((slot, index) => {
        stations[index].slot = slot;
      });

      for (let step = 1; step <= 12; step++) {
        const zoom = from + ((to - from) * step) / 12;
        const placed = atZoom(stations, zoom);
        const slots = stmPlaceStationLabels(placed, true);
        const where = `${file} from zoom ${from} to ${to}, at ${zoom.toFixed(2)}`;

        slots.forEach((slot, index) => {
          if (slot && slot !== placed[index].slot) assert.fail(`${where}: ${placed[index].name} moved`);
        });
        assertClear(placed, slots, where);
        placed.forEach((station, index) => {
          station.slot = slots[index];
        });
      }

      const settled = stmPlaceStationLabels(stations);
      assert.deepEqual(settled, stmPlaceStationLabels(stations.map(({ slot, ...station }) => station)), file);
    }

    for (const station of stations) delete station.slot;
  }
});
