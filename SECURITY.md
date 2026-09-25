# Security policy

## Reporting a vulnerability

Please report security problems privately through
[GitHub security advisories](https://github.com/Aweswomedude1234/motion-cues/security/advisories/new)
rather than in a public issue. We aim to reply within a week.

## What SteadyCues exposes

- **Phone link.** When the phone link is on, SteadyCues listens on TCP port 47821 on your local
  networks. It serves one page and accepts motion samples only under a random, unguessable
  path (`/m/<token>`); everything else gets a 404. Traffic is HTTPS with a certificate generated
  on your PC and stored encrypted with Windows DPAPI for your user account. You can create a new
  pairing token at any time in Settings.
- **No internet access.** SteadyCues makes no outbound connections: no telemetry, no update
  checks, no accounts.
- **Firewall.** The optional "Allow in firewall" button adds a single inbound rule for the
  SteadyCues executable on the phone-link port, and asks for administrator approval first.
