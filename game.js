/* Client-side 9x9 Sudoku — no server, no database, no persistence */

const SIZE = 9;
const BLOCK = 3;

let board = [];      // 0 = empty
let solution = [];
let given = [];      // true = pre-filled (given)

function emptyBoard() {
  return Array(SIZE * SIZE).fill(0);
}

function isValid(board, r, c, val) {
  for (let i = 0; i < SIZE; i++) {
    if (i !== c && board[r * SIZE + i] === val) return false;
    if (i !== r && board[i * SIZE + c] === val) return false;
  }
  const br = Math.floor(r / BLOCK) * BLOCK;
  const bc = Math.floor(c / BLOCK) * BLOCK;
  for (let i = 0; i < BLOCK; i++) {
    for (let j = 0; j < BLOCK; j++) {
      const rr = br + i, cc = bc + j;
      if (rr === r && cc === c) continue;
      if (board[rr * SIZE + cc] === val) return false;
    }
  }
  return true;
}

function solve(b) {
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (b[r * SIZE + c] === 0) {
        const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9];
        for (let i = nums.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [nums[i], nums[j]] = [nums[j], nums[i]];
        }
        for (const n of nums) {
          if (isValid(b, r, c, n)) {
            b[r * SIZE + c] = n;
            if (solve(b)) return b;
            b[r * SIZE + c] = 0;
          }
        }
        return null;
      }
    }
  }
  return b;
}

function generatePuzzle() {
  const solved = emptyBoard();
  solve(solved);
  solution = solved.slice();
  board = solved.slice();

  // Remove ~45 numbers to create a playable puzzle
  let cells = Array.from({ length: SIZE * SIZE }, (_, i) => i);
  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cells[i], cells[j]] = [cells[j], cells[i]];
  }

  given = Array(SIZE * SIZE).fill(false);
  const keep = 28 + Math.floor(Math.random() * 6); // 28-33 givens
  for (let i = 0; i < keep; i++) {
    given[cells[i]] = true;
  }
  for (let i = keep; i < cells.length; i++) {
    board[cells[i]] = 0;
  }
}

/* Rendering */
const gridEl = document.getElementById('grid');
const msgEl = document.getElementById('message');

function render() {
  gridEl.innerHTML = '';
  msgEl.textContent = '';

  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const idx = r * SIZE + c;
      const btn = document.createElement('button');
      btn.className = 'cell' + (given[idx] ? ' given' : '');
      btn.dataset.r = r;
      btn.dataset.c = c;

      const input = document.createElement('input');
      input.type = 'text';
      input.maxLength = 1;
      input.value = board[idx] ? board[idx] : '';
      input.disabled = given[idx];
      input.addEventListener('keydown', e => {
        if (e.key === 'Backspace' || e.key === 'Delete') {
          e.preventDefault();
          if (!given[idx]) {
            board[idx] = 0;
            input.value = '';
            render();
          }
        } else if (/^[1-9]$/.test(e.key)) {
          e.preventDefault();
          if (!given[idx]) {
            board[idx] = parseInt(e.key, 10);
            input.value = e.key;
            render();
          }
        } else {
          e.preventDefault();
        }
      });
      input.addEventListener('click', () => {
        selectCell(r, c);
      });

      btn.appendChild(input);
      gridEl.appendChild(btn);
    }
  }
  highlightSelection();
}

let selectedR = -1, selectedC = -1;

function selectCell(r, c) {
  selectedR = r;
  selectedC = c;
  highlightSelection();
  updateConflicts();
}

function highlightSelection() {
  const cells = gridEl.querySelectorAll('.cell');
  cells.forEach((cell, i) => {
    cell.classList.remove('selected', 'same-row', 'same-col', 'same-block', 'conflict');
    const r = Math.floor(i / SIZE);
    const c = i % SIZE;
    if (r === selectedR && c === selectedC) {
      cell.classList.add('selected');
    }
    if (selectedR >= 0 && selectedC >= 0) {
      if (r === selectedR) cell.classList.add('same-row');
      if (c === selectedC) cell.classList.add('same-col');
      const br = Math.floor(selectedR / BLOCK) * BLOCK;
      const bc = Math.floor(selectedC / BLOCK) * BLOCK;
      if (r >= br && r < br + BLOCK && c >= bc && c < bc + BLOCK) {
        cell.classList.add('same-block');
      }
    }
  });
}

function updateConflicts() {
  const conflicts = new Set();
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const val = board[r * SIZE + c];
      if (val === 0) continue;
      // Check conflicts for this value
      for (let cc = 0; cc < SIZE; cc++) {
        if (cc !== c && board[r * SIZE + cc] === val) conflicts.add(r * SIZE + c);
      }
      for (let rr = 0; rr < SIZE; rr++) {
        if (rr !== r && board[rr * SIZE + c] === val) conflicts.add(r * SIZE + c);
      }
      const br = Math.floor(r / BLOCK) * BLOCK;
      const bc = Math.floor(c / BLOCK) * BLOCK;
      for (let rr = br; rr < br + BLOCK; rr++) {
        for (let cc = bc; cc < bc + BLOCK; cc++) {
          if ((rr !== r || cc !== c) && board[rr * SIZE + cc] === val) {
            conflicts.add(r * SIZE + c);
            conflicts.add(rr * SIZE + cc);
          }
        }
      }
    }
  }
  const cells = gridEl.querySelectorAll('.cell');
  cells.forEach((cell, i) => {
    if (conflicts.has(i) && board[i] !== 0) {
      cell.classList.add('conflict');
    }
  });
}

function checkComplete() {
  for (let i = 0; i < SIZE * SIZE; i++) {
    if (board[i] === 0) return false;
  }
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (!isValid(board, r, c, board[r * SIZE + c])) return false;
    }
  }
  return true;
}

/* Controls */
document.getElementById('newGame').addEventListener('click', () => {
  generatePuzzle();
  selectedR = -1;
  selectedC = -1;
  render();
  msgEl.textContent = '';
});

document.getElementById('check').addEventListener('click', () => {
  if (checkComplete()) {
    msgEl.textContent = 'Puzzle completed!';
    msgEl.style.color = '#8bc34a';
  } else {
    msgEl.textContent = 'Not solved yet — check conflicts in red.';
    msgEl.style.color = '#ffcc80';
  }
  highlightSelection();
  updateConflicts();
});

document.getElementById('hint').addEventListener('click', () => {
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const idx = r * SIZE + c;
      if (board[idx] === 0) {
        board[idx] = solution[idx];
        given[idx] = true;
        render();
        msgEl.textContent = 'Hint applied.';
        return;
      }
    }
  }
  msgEl.textContent = 'No empty cells — puzzle solved!';
});

document.getElementById('clear').addEventListener('click', () => {
  for (let i = 0; i < SIZE * SIZE; i++) {
    if (!given[i]) board[i] = 0;
  }
  selectedR = -1;
  selectedC = -1;
  render();
  msgEl.textContent = '';
});

/* Keyboard number input */
document.addEventListener('keydown', e => {
  if (selectedR < 0 || selectedC < 0) return;
  if (e.key >= '1' && e.key <= '9') {
    const idx = selectedR * SIZE + selectedC;
    if (!given[idx]) {
      board[idx] = parseInt(e.key, 10);
      render();
    }
  } else if (e.key === 'Backspace' || e.key === 'Delete') {
    const idx = selectedR * SIZE + selectedC;
    if (!given[idx]) {
      board[idx] = 0;
      render();
    }
  }
});

/* Init */
generatePuzzle();
render();
