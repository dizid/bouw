-- Create phase_houses table
-- Maps specific house numbers to construction phases (Fase 1-6)
-- Data from Phases-matched-with-house-number.csv
-- Total: 197 houses across 6 phases

-- NOTE: House 290 appears in BOTH Fase 1 (row 17) and Fase 2 (row 14) in the CSV.
-- This script assigns 290 to Fase 1 (first occurrence wins).
-- If it should be Fase 2, manually update after running.

CREATE TABLE IF NOT EXISTS phase_houses (
  phase_number INTEGER NOT NULL CHECK (phase_number BETWEEN 1 AND 6),
  house_number INTEGER NOT NULL UNIQUE,  -- Each house belongs to exactly ONE phase
  PRIMARY KEY (phase_number, house_number)
);

-- Enable RLS (same as other tables)
ALTER TABLE phase_houses ENABLE ROW LEVEL SECURITY;

-- Allow anonymous read access (matches existing pattern)
CREATE POLICY "Allow anonymous read" ON phase_houses
  FOR SELECT TO anon USING (true);

-- Insert phase-house mappings from CSV
-- Using ON CONFLICT to skip duplicates (first occurrence wins)

-- Fase 1: 55 houses
INSERT INTO phase_houses (phase_number, house_number) VALUES
(1, 360), (1, 358), (1, 356), (1, 354), (1, 352), (1, 350), (1, 348), (1, 346),
(1, 304), (1, 302), (1, 300), (1, 298), (1, 296), (1, 294), (1, 292), (1, 290),
(1, 248), (1, 246), (1, 244), (1, 242), (1, 240), (1, 238), (1, 236), (1, 234),
(1, 182), (1, 180), (1, 178), (1, 176), (1, 174), (1, 172), (1, 170), (1, 168),
(1, 116), (1, 114), (1, 112), (1, 110), (1, 108), (1, 106), (1, 104), (1, 102),
(1, 50), (1, 48), (1, 46), (1, 44), (1, 42), (1, 40), (1, 38), (1, 36),
(1, 16), (1, 14), (1, 12), (1, 10), (1, 8), (1, 6), (1, 4)
ON CONFLICT (house_number) DO NOTHING;

-- Fase 2: 37 houses (290 already in Fase 1, will be skipped)
INSERT INTO phase_houses (phase_number, house_number) VALUES
(2, 400), (2, 398), (2, 396), (2, 394), (2, 392), (2, 390), (2, 344), (2, 342),
(2, 340), (2, 338), (2, 336), (2, 334), (2, 290), (2, 288), (2, 286), (2, 284),
(2, 282), (2, 280), (2, 232), (2, 230), (2, 228), (2, 226), (2, 224), (2, 222),
(2, 166), (2, 164), (2, 162), (2, 160), (2, 158), (2, 156), (2, 100), (2, 98),
(2, 96), (2, 94), (2, 92), (2, 90), (2, 410)
ON CONFLICT (house_number) DO NOTHING;

-- Fase 3: 25 houses
INSERT INTO phase_houses (phase_number, house_number) VALUES
(3, 388), (3, 386), (3, 384), (3, 382), (3, 332), (3, 330), (3, 328), (3, 326),
(3, 276), (3, 274), (3, 272), (3, 270), (3, 220), (3, 218), (3, 216), (3, 214),
(3, 154), (3, 152), (3, 150), (3, 148), (3, 88), (3, 86), (3, 84), (3, 82),
(3, 412)
ON CONFLICT (house_number) DO NOTHING;

-- Fase 4: 37 houses
INSERT INTO phase_houses (phase_number, house_number) VALUES
(4, 380), (4, 378), (4, 376), (4, 374), (4, 372), (4, 370), (4, 324), (4, 322),
(4, 320), (4, 318), (4, 316), (4, 314), (4, 268), (4, 266), (4, 264), (4, 262),
(4, 260), (4, 258), (4, 212), (4, 210), (4, 208), (4, 206), (4, 204), (4, 202),
(4, 146), (4, 144), (4, 142), (4, 140), (4, 138), (4, 136), (4, 80), (4, 78),
(4, 76), (4, 74), (4, 72), (4, 70), (4, 34)
ON CONFLICT (house_number) DO NOTHING;

-- Fase 5: 28 houses
INSERT INTO phase_houses (phase_number, house_number) VALUES
(5, 368), (5, 366), (5, 364), (5, 362), (5, 312), (5, 310), (5, 308), (5, 306),
(5, 256), (5, 254), (5, 252), (5, 250), (5, 200), (5, 198), (5, 196), (5, 194),
(5, 134), (5, 132), (5, 130), (5, 128), (5, 68), (5, 66), (5, 64), (5, 62),
(5, 32), (5, 30), (5, 28), (5, 26)
ON CONFLICT (house_number) DO NOTHING;

-- Fase 6: 15 houses
INSERT INTO phase_houses (phase_number, house_number) VALUES
(6, 190), (6, 188), (6, 186), (6, 184), (6, 124), (6, 122), (6, 120), (6, 118),
(6, 58), (6, 56), (6, 54), (6, 52), (6, 22), (6, 20), (6, 18)
ON CONFLICT (house_number) DO NOTHING;

-- Verify counts (run after INSERT)
-- SELECT phase_number, COUNT(*) as house_count FROM phase_houses GROUP BY phase_number ORDER BY phase_number;
-- Expected: Fase 1=55, Fase 2=36 (290 skipped), Fase 3=25, Fase 4=37, Fase 5=28, Fase 6=15 = 196 total
