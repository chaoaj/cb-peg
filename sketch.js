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

function setup() {
  // full-viewport canvas
  const cnv = createCanvas(windowWidth, windowHeight);
  // prevent default touch gestures on canvas
  if (cnv && cnv.elt) cnv.elt.style.touchAction = 'none';

  // initialize board with top hole empty
  initializeBoard(0);

  updateLayout();
  // reflect active open-hole button in UI
  if (typeof updateActiveHoleButton === 'function') updateActiveHoleButton(1);
}

function drawWoodenBoard(centerX, topY, rowSpacing) {
  // compute hole positions to determine triangle bounds
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

  // base gradient
  noStroke();
  const c1 = color('#cfa16e');
  const c2 = color('#b0713a');
  const strips = 40;

  const ctx = drawingContext;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(apex.x, apex.y);
  ctx.lineTo(right.x, right.y);
  ctx.lineTo(left.x, left.y);
  ctx.closePath();
  ctx.clip();

  for (let i = 0; i <= strips; i++) {
    const t = i / strips;
    fill(lerpColor(c1, c2, t));
    const y = apex.y + t * (baseY - apex.y);
    rect(centerX - halfBase - 10, y, halfBase * 2 + 20, (baseY - apex.y) / strips + 1);
  }

  // wood grain
  const grainCount = Math.floor(8 + halfBase / 20);
  for (let g = 0; g < grainCount; g++) {
    const y = apex.y + (g / grainCount) * (baseY - apex.y) + random(-4, 4);
    ctx.beginPath();
    const startX = centerX - halfBase - 20;
    const endX = centerX + halfBase + 20;
    let first = true;
    for (let x = startX; x <= endX; x += 6) {
      const wobble = Math.sin((x * 0.02) + g * 0.6) * (2 + g * 0.12) + random(-1, 1);
      const yy = y + wobble;
      if (first) { ctx.moveTo(x, yy); first = false; } else { ctx.lineTo(x, yy); }
    }
    ctx.strokeStyle = 'rgba(80,50,20,' + (0.06 + Math.random() * 0.06) + ')';
    ctx.lineWidth = 1 + Math.random() * 0.6;
    ctx.stroke();
  }

  ctx.restore();

  // border
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
  // Reserve space for UI text at top and bottom. Use tighter values on very narrow screens (iPhone SE)
  const padding = 12;
  const isNarrow = width <= 380;
  const topReserved = isNarrow ? Math.max(56, height * 0.10) : Math.max(80, height * 0.12);
  const bottomReserved = isNarrow ? Math.max(44, height * 0.06) : Math.max(60, height * 0.08);

  const usableWidth = Math.max(100, width - padding * 2);
  const availableHeight = Math.max(100, height - topReserved - bottomReserved - padding);

  const spacingX = usableWidth / (NUM_ROWS - 1);
  const spacingY = (availableHeight * 2) / ((NUM_ROWS - 1) * Math.sqrt(3));

  // Choose the tighter spacing to fit both axes
  let rawSpacing = Math.min(spacingX, spacingY);
  if (isNarrow) rawSpacing = Math.min(rawSpacing, usableWidth / (NUM_ROWS + 0.5));
  const minSpacing = isNarrow ? 14 : 20;
  const maxSpacing = Math.min(90, rawSpacing);
  boardSpacing = Math.max(minSpacing, maxSpacing);

  // peg radius scales with spacing (slightly smaller on narrow screens)
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

  // UI scale based on spacing (keeps text readable on small screens)
  const uiScale = constrain(boardSpacing / 40, 0.7, 1.25);

  // Title and instructions
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

  // compute layout (centered in the remaining vertical space)
  const centerX = width / 2;
  const rowSpacing = boardSpacing * Math.sqrt(3) / 2; // vertical spacing for triangular packing
  const totalHeight = (NUM_ROWS - 1) * rowSpacing;
  const isNarrow = width <= 380;
  const topReserved = isNarrow ? Math.max(56, height * 0.10) : Math.max(80, height * 0.12);
  const bottomReserved = isNarrow ? Math.max(44, height * 0.06) : Math.max(60, height * 0.08);
  const availableHeight = height - topReserved - bottomReserved;
  const topY = topReserved + Math.max(0, (availableHeight - totalHeight) / 2);

  // Draw wooden board background then holes/pegs
  drawWoodenBoard(centerX, topY, rowSpacing);
  drawBoard(centerX, topY, rowSpacing);

  // Game over message
  if (gameOver) {
    fill(0);
    textAlign(CENTER, CENTER);
    textSize(18 * uiScale);
    text(winMessage, width / 2, height - 28 * uiScale);
  }

  // Peg count
  fill(0);
  textAlign(LEFT, BOTTOM);
  textSize(12 * uiScale);
  text("Pegs remaining: " + countPegs(), 10 * uiScale, height - 6 * uiScale);
}

function drawBoard(centerX, topY, rowSpacing) {
  for (let r = 0; r < NUM_ROWS; r++) {
    for (let c = 0; c <= r; c++) {
      const idx = rcToIndex(r, c);
      const x = centerX + (c - r / 2) * boardSpacing;
      const y = topY + r * rowSpacing;

      // hole (empty holes darker grey)
      stroke(0);
      strokeWeight(1);
      if (board[idx] === 0) {
        fill(180);
      } else {
        fill(220);
      }
      ellipse(x, y, pegRadius * 2 + 6, pegRadius * 2 + 6);

      // peg
      if (board[idx] === 1) {
        const c = pegColors[idx] || '#ffffff';
        fill(c);
        stroke(90);
        ellipse(x, y, pegRadius * 2, pegRadius * 2);
        // detail / rim
        noFill();
        stroke(200);
        ellipse(x, y, pegRadius * 1.5, pegRadius * 1.5);
      }

      // draw hole number label below hole
      noStroke();
      fill(60);
      textAlign(CENTER, TOP);
      const labelSize = Math.max(10, Math.round(pegRadius * 0.6));
      textSize(labelSize);
      text(idx + 1, x, y + pegRadius + 6);

      // selected highlight
      if (selectedIndex === idx) {
        noFill();
        stroke(255, 0, 0);
        strokeWeight(2);
        ellipse(x, y, pegRadius * 2 + 8, pegRadius * 2 + 8);
      }

      // show legal destination highlight for selected peg
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

function touchStarted() {
  // Ensure touch taps are treated like mouse clicks and prevent page scrolling
  mousePressed();
  return false;
}

function touchMoved() {
  // prevent default touch drag behavior while interacting with canvas
  return false;
}

// Convert row/col to linear index: index = row*(row+1)/2 + col
function rcToIndex(row, col) {
  return (row * (row + 1)) / 2 + col;
}

// Convert linear index to {row, col}
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

  // find clicked hole
  const hitRadius = pegRadius + 8;
  for (let r = 0; r < NUM_ROWS; r++) {
    for (let c = 0; c <= r; c++) {
      const idx = rcToIndex(r, c);
      const x = centerX + (c - r / 2) * boardSpacing;
      const y = topY + r * rowSpacing;

      const d = dist(mouseX, mouseY, x, y);
      if (d <= hitRadius) {
        // clicked this hole
        if (board[idx] === 1) {
          // select or change selection
          selectedIndex = idx;
        } else {
          // empty hole: try to move
          if (selectedIndex !== null) {
            if (attemptMove(selectedIndex, idx)) {
              selectedIndex = null;
            } else {
              // invalid move, keep selection
            }
          }
        }
        return;
      }
    }
  }

  // clicked outside: deselect
  selectedIndex = null;
}

// Allow HTML buttons to set the open hole and reset the board
function setOpenHole(n) {
  const i = Math.floor(n) - 1;
  if (isNaN(i) || i < 0 || i >= TOTAL_HOLES) return;
  initializeBoard(i);
  if (typeof updateActiveHoleButton === 'function') updateActiveHoleButton(n);
}

function updateActiveHoleButton(n) {
  const btns = document.querySelectorAll('.hole-btn');
  btns.forEach(b => {
    const val = parseInt(b.getAttribute('data-idx'), 10);
    if (val === n) b.classList.add('active'); else b.classList.remove('active');
  });
}

// Allowed direction unit steps (row,col): six directions for triangular grid
const DIRS = [
  { dr: 0, dc: 1 },
  { dr: 0, dc: -1 },
  { dr: 1, dc: 0 },
  { dr: -1, dc: 0 },
  { dr: 1, dc: 1 },
  { dr: -1, dc: -1 },
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
      // check bounds for mid and end
      if (midR < 0 || midC < 0 || endR < 0 || endC < 0) return false;
      if (midR >= NUM_ROWS || endR >= NUM_ROWS) return false;
      if (midC > midR || endC > endR) return false;

      const midIndex = rcToIndex(midR, midC);
      // must jump over a peg
      return board[midIndex] === 1 && board[toIndex] === 0;
    }
  }
  return false;
}

function attemptMove(fromIndex, toIndex) {
  if (!isValidMove(fromIndex, toIndex)) return false;

  const from = indexToRC(fromIndex);
  // find mid
  const dr = (indexToRC(toIndex).row - from.row) / 2;
  const dc = (indexToRC(toIndex).col - from.col) / 2;
  const midR = from.row + dr;
  const midC = from.col + dc;
  const midIndex = rcToIndex(midR, midC);

  // perform move
  // move peg color
  pegColors[toIndex] = pegColors[fromIndex];
  pegColors[fromIndex] = null;
  pegColors[midIndex] = null;
  // update board occupancy
  board[toIndex] = 1;
  board[fromIndex] = 0;
  board[midIndex] = 0;

  checkWin();
  return true;
}

function countPegs() {
  return board.reduce((s, v) => s + (v === 1 ? 1 : 0), 0);
}

function checkWin() {
  const pegCount = countPegs();
  if (pegCount === 1) {
    gameOver = true;
    winMessage = "🎉 GENIUS! You won! 🎉";
  } else if (pegCount === 2) {
    winMessage = "Pretty smart!";
  } else if (pegCount === 3) {
    winMessage = "Just plain dumb.";
  } else {
    winMessage = "";
  }
}

function keyPressed() {
  if (key === 'r' || key === 'R') {
    initializeBoard(0);
    if (typeof updateActiveHoleButton === 'function') updateActiveHoleButton(1);
  }
}
