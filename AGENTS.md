# AGENTS.md

Purpose
-------
A minimal instruction file to help AI coding agents be productive in this repository.

Project
-------
Static p5.js peg-game demo. Entrypoint: [index.html](index.html); main code: [sketch.js](sketch.js).

How to run (local)
-------------------
- Direct (macOS):

```bash
open index.html
```

- Recommended (serve locally):

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

- Optional (npm utilities):

```bash
npx http-server . -p 8000
npx live-server
```

Key files
---------
- [index.html](index.html) — entrypoint
- [sketch.js](sketch.js) — main p5 sketch
- [style.css](style.css)
- [libraries/p5.min.js](libraries/p5.min.js)
- [libraries/p5.sound.min.js](libraries/p5.sound.min.js)
- [peg-gamerules.txt](peg-gamerules.txt)
- [jsconfig.json](jsconfig.json)
- [LICENSE](LICENSE)

Agent guidance
--------------
- **Scope**: Keep changes minimal and incremental; prefer client-side fixes.
- **Run**: Test changes by serving via HTTP and opening the sketch in a browser.
- **Link-first**: Link to existing docs rather than copying them into this file.
- **No infra by default**: Do not propose adding build tooling, bundlers, or CI unless requested.
- **Audio**: Browsers require user interaction to start audio; avoid suggesting autoplay solutions.
- **Config**: `jsconfig.json` currently references an absolute VSCode extension path — prefer making it portable.
- **License**: Code is GPLv3; respect license when suggesting redistribution or reuse.

Housekeeping (suggested)
------------------------
- Add `.gitignore` entry for `.DS_Store`.
- Make `jsconfig.json` portable (remove absolute extension paths).
- Optionally add a short `README.md` with run instructions.

---

If you want me to apply the housekeeping suggestions and open a PR, reply: create PR
