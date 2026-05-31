/**
 * Zero-dependency .vsix packager.
 *
 * Why this exists: `@vscode/vsce` reliably hangs at startup when run from this
 * project's OneDrive CloudStorage path (it stalls loading its large dependency
 * tree / globbing the cloud-synced folder, producing no output for minutes).
 * A .vsix is just an OPC zip, so we stage the already-bundled files in a fast
 * local temp dir and zip them with the system `zip` tool. Assumes `build:ext`
 * has already produced `extension/dist/extension.cjs`.
 *
 * macOS/Linux only (depends on the `zip` CLI). The MVP is mac-first; revisit if
 * Windows packaging is ever needed.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, mkdirSync, copyFileSync, writeFileSync, rmSync } from 'node:fs';
import { readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const extDir = path.join(repoRoot, 'extension');
const distFile = path.join(extDir, 'dist', 'extension.cjs');

if (!existsSync(distFile)) {
  console.error('Missing extension/dist/extension.cjs — run `npm run build:ext` first.');
  process.exit(1);
}

const xmlEscape = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const manifest = JSON.parse(readFileSync(path.join(extDir, 'package.json'), 'utf8'));
const engine = (manifest.engines && manifest.engines.vscode) || '^1.85.0';
const outName = `${manifest.name}.vsix`;

// Stage the OPC layout in a fast local temp dir (never on the cloud path).
const stage = mkdtempSync(path.join(tmpdir(), 'ccm-vsix-'));
const payload = path.join(stage, 'extension');
mkdirSync(path.join(payload, 'dist'), { recursive: true });
copyFileSync(path.join(extDir, 'package.json'), path.join(payload, 'package.json'));
copyFileSync(distFile, path.join(payload, 'dist', 'extension.cjs'));
const optional = ['README.md', 'LICENSE', 'LICENSE.md', 'LICENSE.txt'];
const assets = [];
for (const f of optional) {
  if (existsSync(path.join(extDir, f))) {
    copyFileSync(path.join(extDir, f), path.join(payload, f));
    if (f.startsWith('README')) {
      assets.push(`    <Asset Type="Microsoft.VisualStudio.Services.Content.Details" Path="extension/${f}" Addressable="true"/>`);
    }
  }
}

writeFileSync(
  path.join(stage, '[Content_Types].xml'),
  `<?xml version="1.0" encoding="utf-8"?>\n` +
    `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
    `<Default Extension="json" ContentType="application/json"/>` +
    `<Default Extension="cjs" ContentType="application/javascript"/>` +
    `<Default Extension="md" ContentType="text/markdown"/>` +
    `<Default Extension="vsixmanifest" ContentType="text/xml"/>` +
    `</Types>\n`,
);

writeFileSync(
  path.join(stage, 'extension.vsixmanifest'),
  `<?xml version="1.0" encoding="utf-8"?>
<PackageManifest Version="2.0.0" xmlns="http://schemas.microsoft.com/developer/vsx-schema/2011" xmlns:d="http://schemas.microsoft.com/developer/vsx-schema-design/2011">
  <Metadata>
    <Identity Language="en-US" Id="${xmlEscape(manifest.name)}" Version="${xmlEscape(manifest.version)}" Publisher="${xmlEscape(manifest.publisher || 'local')}"/>
    <DisplayName>${xmlEscape(manifest.displayName || manifest.name)}</DisplayName>
    <Description xml:space="preserve">${xmlEscape(manifest.description || '')}</Description>
    <Tags></Tags>
    <Categories>${xmlEscape((manifest.categories || ['Other']).join(','))}</Categories>
    <GalleryFlags>Public</GalleryFlags>
    <Properties>
      <Property Id="Microsoft.VisualStudio.Code.Engine" Value="${xmlEscape(engine)}"/>
      <Property Id="Microsoft.VisualStudio.Code.ExtensionDependencies" Value=""/>
      <Property Id="Microsoft.VisualStudio.Code.ExtensionPack" Value=""/>
      <Property Id="Microsoft.VisualStudio.Code.ExtensionKind" Value="workspace"/>
    </Properties>
  </Metadata>
  <Installation>
    <InstallationTarget Id="Microsoft.VisualStudio.Code"/>
  </Installation>
  <Dependencies/>
  <Assets>
    <Asset Type="Microsoft.VisualStudio.Code.Manifest" Path="extension/package.json" Addressable="true"/>
${assets.join('\n')}
  </Assets>
</PackageManifest>\n`,
);

const tmpVsix = path.join(stage, outName);
try {
  execFileSync('zip', ['-rqX', tmpVsix, '[Content_Types].xml', 'extension.vsixmanifest', 'extension'], {
    cwd: stage,
    stdio: ['ignore', 'inherit', 'inherit'],
  });
} catch (err) {
  console.error('Failed to run `zip`. Install it or package on a non-OneDrive path.', err.message);
  process.exit(1);
}

const dest = path.join(extDir, outName);
copyFileSync(tmpVsix, dest);
rmSync(stage, { recursive: true, force: true });
console.log(`Packaged ${dest}`);
