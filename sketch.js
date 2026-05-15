// Peg Solitaire - Triangular 15-hole board (Cracker Barrel style)

const NUM_ROWS = 5; // 5 rows -> 15 holes
const TOTAL_HOLES = (NUM_ROWS * (NUM_ROWS + 1)) / 2;
let board = new Array(TOTAL_HOLES).fill(1); // 1 = peg present, 0 = empty
let pegRadius = 15;
let boardSpacing = 40;
let selectedIndex = null;
let gameOver = false;
let winMessage = "";
// per-peg colors (randomized)
let pegColors = new Array(TOTAL_HOLES).fill(null);
const PEG_PALETTE = ['#E67E22', '#F1C40F', '#3498DB', '#F1C40F', '#FFFFFF'];

// Cached wood texture buffer to avoid redrawing grain every frame (prevents flicker)
let woodBuffer = null;
let woodBufferKey = { w: 0, h: 0, spacing: 0, topY: -1 };

// Undo functionality - store move history
let moveHistory = [];

function setup() {
  const cnv = createCanvas(windowWidth, windowHeight);
  if (cnv && cnv.elt) cnv.elt.style.touchAction = 'none';
  initializeBoard(0);
  updateLayout();
  if (typeof updateActiveHoleButton === 'function') updateActiveHoleButton(1);
  // Wire bottom dropdown + button (if present)
  const sel = typeof document !== 'undefined' ? document.getElementById('hole-select') : null;
  const btn = typeof document !== 'undefined' ? document.getElementById('hole-select-btn') : null;
  if (sel) {
    // populate fallback if empty
    if (sel.options.length === 0) {
      for (let i = 1; i <= TOTAL_HOLES; i++) {
        const opt = document.createElement('option');
        opt.value = i;
        opt.text = 'Open hole ' + i;
        sel.appendChild(opt);
      }
    }
    sel.value = '1';
  }
  if (btn && sel) {
    btn.addEventListener('click', () => {
      const v = parseInt(sel.value, 10);
      if (!isNaN(v)) setOpenHole(v);
    });
  }
}

function drawWoodenBoard(centerX, topY, rowSpacing) {
  // compute triangle bounds
  const xs = [];
  const ys = [];
  for (let r = 0; r < NUM_ROWS; r++) {
    for (let c = 0; c <= r; c++) {
      const x = centerX + (c - r / 2) * boardSpacing;
      const y = topY + r * rowSpacing;
      xs.push(x);
      ys.push(y);
    }
  }
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const padX = boardSpacing * 0.9;
  const padY = rowSpacing * 0.9;

  const apex = { x: centerX, y: minY - padY };
  const baseY = maxY + padY;
  const halfBase = (maxX - minX) / 2 + padX;
  const left = { x: centerX - halfBase, y: baseY };
  const right = { x: centerX + halfBase, y: baseY };

  // Regenerate the wood buffer only when layout changes to avoid flicker
  const needNew = !woodBuffer || woodBufferKey.w !== width || woodBufferKey.h !== height || woodBufferKey.spacing !== boardSpacing || Math.abs(woodBufferKey.topY - topY) > 1;
  if (needNew) {
    woodBuffer = createGraphics(width, height);
    woodBuffer.clear();
    const g = woodBuffer;

    // deterministic PRNG so texture is stable across frames
    function makePRNG(seed) {
      let s = seed >>> 0;
      return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    }
    const seed = Math.floor(centerX + topY + boardSpacing * 1000) || 1;
    const rnd = makePRNG(seed);

    const c1 = color('#cfa16e');
    const c2 = color('#b0713a');
    const strips = 40;
    const ctx = g.drawingContext;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(apex.x, apex.y);
    ctx.lineTo(right.x, right.y);
    ctx.lineTo(left.x, left.y);
    ctx.closePath();
    ctx.clip();

    for (let i = 0; i <= strips; i++) {
      const t = i / strips;
      const col = lerpColor(c1, c2, t);
      g.noStroke();
      g.fill(col);
      const y = apex.y + t * (baseY - apex.y);
      g.rect(centerX - halfBase - 10, y, halfBase * 2 + 20, (baseY - apex.y) / strips + 1);
    }

    const grainCount = Math.floor(8 + halfBase / 20);
    for (let gi = 0; gi < grainCount; gi++) {
      const y = apex.y + (gi / grainCount) * (baseY - apex.y) + (rnd() * 8 - 4);
      ctx.beginPath();
      const startX = centerX - halfBase - 20;
      const endX = centerX + halfBase + 20;
      let firstp = true;
      for (let x = startX; x <= endX; x += 6) {
        const wobble = Math.sin((x * 0.02) + gi * 0.6) * (2 + gi * 0.12) + (rnd() * 2 - 1);
        const yy = y + wobble;
        if (firstp) { ctx.moveTo(x, yy); firstp = false; } else { ctx.lineTo(x, yy); }
      }
      ctx.strokeStyle = 'rgba(80,50,20,' + (0.06 + rnd() * 0.06) + ')';
      ctx.lineWidth = 1 + rnd() * 0.6;
      ctx.stroke();
    }
    ctx.restore();

    woodBufferKey = { w: width, h: height, spacing: boardSpacing, topY: topY };
  }

  // draw the cached buffer and then the border
  image(woodBuffer, 0, 0);
  noFill();
  stroke('#8a5a2b');
  strokeWeight(2);
  beginShape();
  vertex(apex.x, apex.y);
  vertex(right.x, right.y);
  vertex(left.x, left.y);
  endShape(CLOSE);
}

function updateLayout() {
  const padding = 12;
  const isNarrow = width <= 380;
  const topReserved = isNarrow ? Math.max(56, height * 0.10) : Math.max(80, height * 0.12);
  // take bottom-controls height into account so canvas sits above the UI
  let bottomControlsHeight = 0;
  if (typeof document !== 'undefined') {
    const bottomEl = document.getElementById('bottom-controls');
    if (bottomEl && bottomEl.offsetHeight) bottomControlsHeight = bottomEl.offsetHeight + 12;
  }
  const bottomReserved = isNarrow ? Math.max(44, height * 0.06, bottomControlsHeight) : Math.max(60, height * 0.08, bottomControlsHeight);
  const usableWidth = Math.max(100, width - padding * 2);
  const availableHeight = Math.max(100, height - topReserved - bottomReserved - padding);
  const spacingX = usableWidth / (NUM_ROWS - 1);
  const spacingY = (availableHeight * 2) / ((NUM_ROWS - 1) * Math.sqrt(3));
  let rawSpacing = Math.min(spacingX, spacingY);
  if (isNarrow) rawSpacing = Math.min(rawSpacing, usableWidth / (NUM_ROWS + 0.5));
  const minSpacing = isNarrow ? 14 : 20;
  const maxSpacing = Math.min(90, rawSpacing);
  boardSpacing = Math.max(minSpacing, maxSpacing);
  pegRadius = Math.max(6, boardSpacing * (isNarrow ? 0.28 : 0.32));
}

function initializeBoard(openIndex) {
  for (let i = 0; i < TOTAL_HOLES; i++) {
    board[i] = 1;
    pegColors[i] = randomPegColor();
  }
  if (openIndex >= 0 && openIndex < TOTAL_HOLES) {
    board[openIndex] = 0;
    pegColors[openIndex] = null;
  }
  selectedIndex = null;
  gameOver = false;
  winMessage = "";
  moveHistory = [];
}

function randomPegColor() {
  const i = Math.floor(random(PEG_PALETTE.length));
  return PEG_PALETTE[i];
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  updateLayout();
}

function draw() {
  background(240);
  updateLayout();
  const uiScale = constrain(boardSpacing / 40, 0.7, 1.25);
  fill(0);
  textAlign(CENTER, TOP);
  textSize(18 * uiScale);
  text("Peg Solitaire", width / 2, 10 * uiScale);
  textAlign(LEFT, TOP);
  textSize(12 * uiScale);
  noStroke();
  fill(60);
  text("Click a peg to select it. Click an empty hole to jump.", 10 * uiScale, 34 * uiScale);
  text("Goal: Leave only 1 peg.", 10 * uiScale, 50 * uiScale);
  text("Press 'r' to reset.", 10 * uiScale, 66 * uiScale);
  const centerX = width / 2;
  const rowSpacing = boardSpacing * Math.sqrt(3) / 2;
  const totalHeight = (NUM_ROWS - 1) * rowSpacing;
  const isNarrow = width <= 380;
  const topReserved = isNarrow ? Math.max(56, height * 0.10) : Math.max(80, height * 0.12);
  // account for bottom-controls height when computing topY
  let bottomControlsHeight = 0;
  if (typeof document !== 'undefined') {
    const bottomEl = document.getElementById('bottom-controls');
    if (bottomEl && bottomEl.offsetHeight) bottomControlsHeight = bottomEl.offsetHeight + 12;
  }
  const bottomReserved = isNarrow ? Math.max(44, height * 0.06, bottomControlsHeight) : Math.max(60, height * 0.08, bottomControlsHeight);
  const availableHeight = height - topReserved - bottomReserved;
  const topY = topReserved + Math.max(0, (availableHeight - totalHeight) / 2);
  drawWoodenBoard(centerX, topY, rowSpacing);
  drawBoard(centerX, topY, rowSpacing);
  if (gameOver) {
    fill(0);
    textAlign(CENTER, CENTER);
    textSize(18 * uiScale);
    text(winMessage, width / 2, height - 28 * uiScale);
  }
  fill(0);
  textAlign(LEFT, BOTTOM);
  textSize(12 * uiScale);
  text("Pegs remaining: " + countPegs(), 10 * uiScale, height - 6 * uiScale);
  drawUndoButton(uiScale);
}

function drawBoard(centerX, topY, rowSpacing) {
  for (let r = 0; r < NUM_ROWS; r++) {
    for (let col = 0; col <= r; col++) {
      const idx = rcToIndex(r, col);
      const x = centerX + (col - r / 2) * boardSpacing;
      const y = topY + r * rowSpacing;
      stroke(0);
      strokeWeight(1);
      if (board[idx] === 0) fill(180); else fill(220);
      ellipse(x, y, pegRadius * 2 + 6, pegRadius * 2 + 6);
      if (board[idx] === 1) {
        const pegCol = pegColors[idx] || '#ffffff';
        fill(pegCol);
        stroke(90);
        ellipse(x, y, pegRadius * 2, pegRadius * 2);
        noFill();
        stroke(200);
        ellipse(x, y, pegRadius * 1.5, pegRadius * 1.5);
      }
      noStroke();
      fill(60);
      textAlign(CENTER, TOP);
      const labelSize = Math.max(10, Math.round(pegRadius * 0.6));
      textSize(labelSize);
      text(idx + 1, x, y + pegRadius + 6);
      if (selectedIndex === idx) {
        noFill();
        stroke(255, 0, 0);
        strokeWeight(2);
        ellipse(x, y, pegRadius * 2 + 8, pegRadius * 2 + 8);
      }
      if (selectedIndex !== null && board[idx] === 0) {
        if (isValidMove(selectedIndex, idx)) {
          noFill();
          stroke(0, 150, 0);
          strokeWeight(2);
          ellipse(x, y, pegRadius * 2 + 4, pegRadius * 2 + 4);
        }
      }
    }
  }
}

function touchStarted() { mousePressed(); return false; }
function touchMoved() { return false; }

function rcToIndex(row, col) { return (row * (row + 1)) / 2 + col; }

function indexToRC(index) {
  let row = 0;
  while (rcToIndex(row + 1, 0) <= index) row++;
  const col = index - rcToIndex(row, 0);
  return { row, col };
}

function mousePressed() {
  if (gameOver) return;
  const centerX = width / 2;
  const rowSpacing = boardSpacing * Math.sqrt(3) / 2;
  const totalHeight = (NUM_ROWS - 1) * rowSpacing;
  const isNarrow = width <= 380;
  const topReserved = isNarrow ? Math.max(56, height * 0.10) : Math.max(80, height * 0.12);
  const bottomReserved = isNarrow ? Math.max(44, height * 0.06) : Math.max(60, height * 0.08);
  const availableHeight = height - topReserved - bottomReserved;
  const topY = topReserved + Math.max(0, (availableHeight - totalHeight) / 2);
  const uiScale = constrain(boardSpacing / 40, 0.7, 1.25);
  const undoButtonWidth = 60 * uiScale;
  const undoButtonHeight = 30 * uiScale;
  const undoButtonX = width - 70 * uiScale;
  const undoButtonY = 10 * uiScale;
  if (mouseX > undoButtonX && mouseX < undoButtonX + undoButtonWidth && mouseY > undoButtonY && mouseY < undoButtonY + undoButtonHeight) {
    handleUndo();
    return;
  }
  const hitRadius = pegRadius + 8;
  for (let r = 0; r < NUM_ROWS; r++) {
    for (let col = 0; col <= r; col++) {
      const idx = rcToIndex(r, col);
      const x = centerX + (col - r / 2) * boardSpacing;
      const y = topY + r * rowSpacing;
      const d = dist(mouseX, mouseY, x, y);
      if (d <= hitRadius) {
        if (board[idx] === 1) {
          selectedIndex = idx;
        } else {
          if (selectedIndex !== null) {
            if (attemptMove(selectedIndex, idx)) selectedIndex = null;
          }
        }
        return;
      }
    }
  }
  selectedIndex = null;
}

function setOpenHole(n) {
  const i = Math.floor(n) - 1;
  if (isNaN(i) || i < 0 || i >= TOTAL_HOLES) return;
  initializeBoard(i);
  if (typeof updateActiveHoleButton === 'function') updateActiveHoleButton(n);
  // reflect selection in bottom dropdown if present
  if (typeof document !== 'undefined') {
    const sel = document.getElementById('hole-select');
    if (sel) sel.value = String(Math.floor(n));
  }
}

function updateActiveHoleButton(n) {
  const btns = document.querySelectorAll('.hole-btn');
  btns.forEach(b => {
    const val = parseInt(b.getAttribute('data-idx'), 10);
    if (val === n) b.classList.add('active'); else b.classList.remove('active');
  });
}

function drawUndoButton(uiScale) {
  const buttonWidth = 60 * uiScale;
  const buttonHeight = 30 * uiScale;
  const buttonX = width - 70 * uiScale;
  const buttonY = 10 * uiScale;
  fill(200);
  stroke(100);
  strokeWeight(1);
  rect(buttonX, buttonY, buttonWidth, buttonHeight, 5);
  fill(0);
  textAlign(CENTER, CENTER);
  textSize(12 * uiScale);
  text("Undo", buttonX + buttonWidth / 2, buttonY + buttonHeight / 2);
}

function handleUndo() {
  if (moveHistory.length === 0) return;
  const s = moveHistory.pop();
  for (let i = 0; i < TOTAL_HOLES; i++) { board[i] = s.board[i]; pegColors[i] = s.pegColors[i]; }
  selectedIndex = s.selectedIndex;
  gameOver = s.gameOver;
  winMessage = s.winMessage;
}

const DIRS = [
  { dr: 0, dc: 1 }, { dr: 0, dc: -1 }, { dr: 1, dc: 0 }, { dr: -1, dc: 0 }, { dr: 1, dc: 1 }, { dr: -1, dc: -1 }
];

function isValidMove(fromIndex, toIndex) {
  if (fromIndex === toIndex) return false;
  if (board[fromIndex] !== 1) return false;
  if (board[toIndex] !== 0) return false;
  const from = indexToRC(fromIndex);
  const to = indexToRC(toIndex);
  for (let d of DIRS) {
    const midR = from.row + d.dr;
    const midC = from.col + d.dc;
    const endR = from.row + 2 * d.dr;
    const endC = from.col + 2 * d.dc;
    if (endR === to.row && endC === to.col) {
      if (midR < 0 || midC < 0 || endR < 0 || endC < 0) return false;
      if (midR >= NUM_ROWS || endR >= NUM_ROWS) return false;
      if (midC > midR || endC > endR) return false;
      const midIndex = rcToIndex(midR, midC);
      return board[midIndex] === 1 && board[toIndex] === 0;
    }
  }
  return false;
}

function attemptMove(fromIndex, toIndex) {
  if (!isValidMove(fromIndex, toIndex)) return false;
  moveHistory.push({ board: [...board], pegColors: [...pegColors], selectedIndex, gameOver, winMessage });
  const from = indexToRC(fromIndex);
  const to = indexToRC(toIndex);
  const dr = (to.row - from.row) / 2;
  const dc = (to.col - from.col) / 2;
  const midR = from.row + dr;
  const midC = from.col + dc;
  const midIndex = rcToIndex(midR, midC);
  pegColors[toIndex] = pegColors[fromIndex];
  pegColors[fromIndex] = null;
  pegColors[midIndex] = null;
  board[toIndex] = 1;
  board[fromIndex] = 0;
  board[midIndex] = 0;
  checkWin();
  return true;
}

function countPegs() { return board.reduce((s, v) => s + (v === 1 ? 1 : 0), 0); }

function checkWin() {
  const pegCount = countPegs();
  if (pegCount === 1) { gameOver = true; winMessage = "🎉 GENIUS! You won! 🎉"; }
  else if (pegCount === 2) winMessage = "Pretty smart!";
  else if (pegCount === 3) winMessage = "Just plain dumb.";
  else winMessage = "";
}

function keyPressed() {
  if (key === 'r' || key === 'R') { initializeBoard(0); if (typeof updateActiveHoleButton === 'function') updateActiveHoleButton(1); }
  if (key === 'u' || key === 'U') handleUndo();
}
