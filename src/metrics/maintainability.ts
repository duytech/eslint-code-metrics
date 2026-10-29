export type MaintainabilityBand = 'green' | 'yellow' | 'red';

/**
 * Maintainability Index as computed by Visual Studio:
 * MAX(0, (171 - 5.2 * ln(HV) - 0.23 * CC - 16.2 * ln(LOC)) * 100 / 171), rounded to an integer.
 */
export function computeMaintainabilityIndex(halsteadVolume: number, cyclomaticComplexity: number, linesOfCode: number): number {
  const raw =
    171 -
    5.2 * Math.log(Math.max(halsteadVolume, 1)) -
    0.23 * cyclomaticComplexity -
    16.2 * Math.log(Math.max(linesOfCode, 1));
  return Math.round(Math.min(100, Math.max(0, (raw * 100) / 171)));
}

/** Visual Studio bands: 20-100 green, 10-19 yellow, 0-9 red. */
export function getBand(maintainabilityIndex: number): MaintainabilityBand {
  if (maintainabilityIndex >= 20) return 'green';
  if (maintainabilityIndex >= 10) return 'yellow';
  return 'red';
}
