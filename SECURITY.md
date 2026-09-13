# Security policy

Security fixes target the latest version on the default branch. Older published versions are not maintained separately.

## Report a vulnerability privately

Email **olivier@odeschenes.com** with the subject `Security: metro marketplace extension`. Include the affected version, reproduction steps, impact, and a minimal example using synthetic data. This is the project's existing public support address.

Do not include passwords, access tokens, browser cookies, private messages, or real saved locations. Do not open a public issue for an unpatched vulnerability. The maintainer will coordinate disclosure after investigating; there is no guaranteed response time or bug bounty.

## Security boundaries

The extension stores preferences and landmarks in `chrome.storage.local`. It does not operate a developer backend or transmit those values to one. Its network data is packaged locally. Landmarks are inserted into the host page and are consequently readable by that page's scripts.

On a Centris Local Logic frame, a page-world bridge obtains map projection information. DOM attributes shared with the host page are not a trusted security boundary. Changes to this bridge, host matching, extension permissions, storage, or data handling need explicit review.

CI runs regression tests, dependency auditing, and a redacted Gitleaks history scan. These checks supplement review and do not guarantee the absence of vulnerabilities. If a credential is ever committed, revoke or rotate it first; deleting the latest copy does not remove it from Git history.
