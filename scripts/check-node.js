// Written in old-style JavaScript so that it runs, and explains itself, even on very old Node versions.
var parts = process.versions.node.split('.').map(Number);
var major = parts[0], minor = parts[1], patch = parts[2];
var ok =
  (major === 18 && (minor > 19 || (minor === 19 && patch >= 1))) ||
  (major === 20 && (minor > 11 || (minor === 11 && patch >= 1))) ||
  major >= 22;

if (!ok) {
  console.error('\nThis project needs Node.js 18.19.1+, 20.11.1+ or 22+. You have ' + process.version + '.');
  console.error('Install the LTS version from https://nodejs.org and try again.\n');
  process.exit(1);
}
