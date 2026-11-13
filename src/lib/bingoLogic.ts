export const TILE_COLORS = [
  "#f59e0b", // Sárga (Évszám)
  "#10b981", // Zöld (Dalcím)
  "#ec4899", // Rózsaszín (Előadó)
  "#8b5cf6", // Lila (Mindent bele)
  "#06b6d4", // Kék (Szabad tipp / Bónusz)
];

export const createEmptyGrid = (): boolean[][] =>
  Array.from({ length: 5 }, () => Array(5).fill(false));

export const generateRandomColorGrid = (): number[][] => {
  const bag: number[] = [];
  for (let c = 0; c < 5; c++) {
    for (let k = 0; k < 5; k++) bag.push(c);
  }
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }
  const grid: number[][] = [];
  for (let r = 0; r < 5; r++) {
    grid.push(bag.slice(r * 5, (r + 1) * 5));
  }
  return grid;
};

export const checkBingo = (grid: boolean[][]): boolean => {
  for (let r = 0; r < 5; r++) {
    if (grid[r].every(Boolean)) return true;
  }
  for (let c = 0; c < 5; c++) {
    if (grid.every((row) => row[c])) return true;
  }
  if ([0, 1, 2, 3, 4].every((i) => grid[i][i])) return true;
  if ([0, 1, 2, 3, 4].every((i) => grid[i][4 - i])) return true;
  return false;
};

export const getWinningCells = (grid: boolean[][]): Set<string> => {
  const cells = new Set<string>();
  for (let r = 0; r < 5; r++) {
    if (grid[r].every(Boolean)) {
      for (let c = 0; c < 5; c++) cells.add(`${r}-${c}`);
    }
  }
  for (let c = 0; c < 5; c++) {
    if (grid.every((row) => row[c])) {
      for (let r = 0; r < 5; r++) cells.add(`${r}-${c}`);
    }
  }
  if ([0, 1, 2, 3, 4].every((i) => grid[i][i])) {
    for (let i = 0; i < 5; i++) cells.add(`${i}-${i}`);
  }
  if ([0, 1, 2, 3, 4].every((i) => grid[i][4 - i])) {
    for (let i = 0; i < 5; i++) cells.add(`${i}-${4 - i}`);
  }
  return cells;
};

/**
 * Visszaadja azon üres cellák koordinátáit (`"${r}-${c}"`), amelyek kitöltése
 * azonnali Bingót eredményez (Meccslabda / Bingo-veszély állapot).
 */
export const getMatchPointCells = (grid: boolean[][]): Set<string> => {
  const matchCells = new Set<string>();
  if (!Array.isArray(grid) || grid.length !== 5 || checkBingo(grid)) return matchCells;

  // Sorok
  for (let r = 0; r < 5; r++) {
    let unmarkedCol = -1;
    let markedCount = 0;
    for (let c = 0; c < 5; c++) {
      if (grid[r]?.[c]) markedCount++;
      else unmarkedCol = c;
    }
    if (markedCount === 4 && unmarkedCol !== -1) {
      matchCells.add(`${r}-${unmarkedCol}`);
    }
  }

  // Oszlopok
  for (let c = 0; c < 5; c++) {
    let unmarkedRow = -1;
    let markedCount = 0;
    for (let r = 0; r < 5; r++) {
      if (grid[r]?.[c]) markedCount++;
      else unmarkedRow = r;
    }
    if (markedCount === 4 && unmarkedRow !== -1) {
      matchCells.add(`${unmarkedRow}-${c}`);
    }
  }

  // Főátló
  {
    let unmarkedIdx = -1;
    let markedCount = 0;
    for (let i = 0; i < 5; i++) {
      if (grid[i]?.[i]) markedCount++;
      else unmarkedIdx = i;
    }
    if (markedCount === 4 && unmarkedIdx !== -1) {
      matchCells.add(`${unmarkedIdx}-${unmarkedIdx}`);
    }
  }

  // Mellékátló
  {
    let unmarkedIdx = -1;
    let markedCount = 0;
    for (let i = 0; i < 5; i++) {
      if (grid[i]?.[4 - i]) markedCount++;
      else unmarkedIdx = i;
    }
    if (markedCount === 4 && unmarkedIdx !== -1) {
      matchCells.add(`${unmarkedIdx}-${4 - unmarkedIdx}`);
    }
  }

  return matchCells;
};

export const isOneAwayFromBingo = (grid: boolean[][]): boolean => {
  return getMatchPointCells(grid).size > 0;
};
