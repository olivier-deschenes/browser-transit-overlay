"""Generate one geometry file per city from the checked-in source data.

The files hold geometry and nothing else: ids, paths, stations, and the notice
the licence asks to travel with them. What colour each line is drawn in and who
to credit for it are the extension registry's to say, in extension/networks.js,
and what it is called is each language's, in extension/i18n.js, so that none of
it is stated in two places.
"""

import json
from pathlib import Path

from cities import CITIES


OUTPUT = Path(__file__).resolve().parents[2] / "extension" / "networks"


def write_city(city):
    data = city.build()
    output = OUTPUT / f"{city.ID}.json"
    output.write_text(
        json.dumps(data, ensure_ascii=False, separators=(",", ":")) + "\n",
        encoding="utf-8",
        newline="\n",
    )

    return output, data


def main():
    OUTPUT.mkdir(parents=True, exist_ok=True)

    for city in CITIES:
        output, data = write_city(city)
        points = sum(
            len(path) for line in data["lines"] for path in line["paths"]
        )
        print(
            f"{output.name}: {len(data['lines'])} lines, {points} points, "
            f"{len(data['stations'])} stations, "
            f"{output.stat().st_size / 1024:.1f} KiB"
        )


if __name__ == "__main__":
    main()
