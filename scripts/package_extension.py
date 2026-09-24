"""Create a reproducible extension ZIP without local files or build debris."""

import json
from pathlib import Path
import re
import zipfile


ROOT = Path(__file__).resolve().parents[1]
RUNTIME_FILES = (
    "background.js",
    "bridge.js",
    "content.css",
    "content.js",
    "i18n.js",
    "icons/icon-16.png",
    "icons/icon-32.png",
    "icons/icon-48.png",
    "icons/icon-128.png",
    "labels.js",
    "manifest.json",
    "networks.js",
    "options.css",
    "options.html",
    "options.js",
    "settings.js",
    "sites.js",
)


def network_files(root):
    """The geometry files, found rather than listed.

    Which cities ship is the registry's decision and the build writes one file
    per city, so listing them here as well would be a third place to keep in
    step. Only JSON directly under networks/ is taken, so nothing else that
    lands in the folder can ride along with it.
    """
    names = sorted(
        f"networks/{path.name}"
        for path in (root / "extension/networks").glob("*.json")
    )
    if not names:
        raise ValueError("No network geometry to package")
    return names


def locale_files(root):
    """The name and description Chrome shows for the extension, per language.

    Found rather than listed, like the geometry: which languages ship is
    extension/i18n.js's decision, and its tests hold these folders to it.
    """
    names = sorted(
        f"_locales/{path.parent.name}/messages.json"
        for path in (root / "extension/_locales").glob("*/messages.json")
    )
    if not names:
        raise ValueError("No locale messages to package")
    return names


def package_extension(root=ROOT, output_directory=None):
    root = Path(root)
    output_directory = Path(output_directory or root / "dist")
    manifest = json.loads((root / "extension/manifest.json").read_text("utf-8"))
    version = manifest["version"]
    if not isinstance(version, str) or not re.fullmatch(r"\d+(?:\.\d+){0,3}", version):
        raise ValueError("Expected a numeric Chrome extension version")

    sources = {
        name: root / "extension" / name
        for name in (*RUNTIME_FILES, *network_files(root), *locale_files(root))
    } | {
        "LICENSE": root / "LICENSE",
        "LICENSE-DATA.txt": root / "rem_data/__Licence.txt",
        "THIRD_PARTY_NOTICES.md": root / "THIRD_PARTY_NOTICES.md",
    }
    # Validate everything before opening an existing output for replacement.
    for source in sources.values():
        if not source.is_file() or source.is_symlink():
            raise ValueError(f"Missing or symlinked release file: {source}")
        if not source.resolve().is_relative_to(root.resolve()):
            raise ValueError(f"Release file outside repository: {source}")

    output_directory.mkdir(parents=True, exist_ok=True)
    output = output_directory / f"browser-transit-overlay-{version}.zip"
    with zipfile.ZipFile(output, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for name, source in sorted(sources.items()):
            info = zipfile.ZipInfo(name, date_time=(1980, 1, 1, 0, 0, 0))
            info.create_system = 3
            info.external_attr = 0o100644 << 16
            content = source.read_bytes()
            if source.suffix != ".png":
                content = content.replace(b"\r\n", b"\n")
            archive.writestr(info, content, compress_type=zipfile.ZIP_DEFLATED, compresslevel=9)
    return output


if __name__ == "__main__":
    print(package_extension())
