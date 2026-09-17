import fnmatch
import importlib.util
import json
from pathlib import Path
import shutil
import tempfile
import unittest
import zipfile


ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("package_extension", ROOT / "scripts/package_extension.py")
packaging = importlib.util.module_from_spec(spec)
spec.loader.exec_module(packaging)


class PackageTests(unittest.TestCase):
    def test_archive_is_reproducible_and_contains_runtime_assets_and_notices(self):
        with tempfile.TemporaryDirectory() as directory:
            output = packaging.package_extension(output_directory=directory)
            first = output.read_bytes()
            self.assertEqual(first, packaging.package_extension(output_directory=directory).read_bytes())
            with zipfile.ZipFile(output) as archive:
                self.assertIsNone(archive.testzip())
                names = set(archive.namelist())
                manifest = json.loads(archive.read("manifest.json"))
                self.assertEqual(output.name, f"browser-transit-overlay-{manifest['version']}.zip")
                self.assertIn("LICENSE", names)
                self.assertIn("LICENSE-DATA.txt", names)
                self.assertIn("THIRD_PARTY_NOTICES.md", names)
                self.assertIn(manifest["background"]["service_worker"], names)
                self.assertIn(manifest["options_ui"]["page"], names)
                for script in manifest["content_scripts"]:
                    for asset in script.get("js", []) + script.get("css", []):
                        self.assertIn(asset, names)
                for resource in manifest["web_accessible_resources"]:
                    for asset in resource["resources"]:
                        # A resource may be a pattern: the geometry files are
                        # named for the cities that ship, not written out.
                        self.assertTrue(fnmatch.filter(names, asset), asset)
                for icon in manifest["icons"].values():
                    self.assertIn(icon, names)
                # A manifest that names its default locale will not load
                # without that locale's messages beside it.
                self.assertIn(f"_locales/{manifest['default_locale']}/messages.json", names)

    def test_unlisted_local_files_cannot_enter_the_archive(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            shutil.copytree(ROOT / "extension", root / "extension")
            shutil.copy(ROOT / "LICENSE", root / "LICENSE")
            shutil.copy(ROOT / "THIRD_PARTY_NOTICES.md", root / "THIRD_PARTY_NOTICES.md")
            (root / "rem_data").mkdir()
            shutil.copy(ROOT / "rem_data/__Licence.txt", root / "rem_data/__Licence.txt")
            for name in [".env", ".DS_Store", "private-notes.txt", "extension.zip"]:
                (root / "extension" / name).write_text("local test fixture")
            with zipfile.ZipFile(packaging.package_extension(root=root)) as archive:
                for name in [".env", ".DS_Store", "private-notes.txt", "extension.zip"]:
                    self.assertNotIn(name, archive.namelist())
            (root / "extension/content.js").unlink()
            with self.assertRaises(ValueError):
                packaging.package_extension(root=root)


if __name__ == "__main__":
    unittest.main()
