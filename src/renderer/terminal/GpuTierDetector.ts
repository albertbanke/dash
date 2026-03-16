export type GpuTier = 'high' | 'mid' | 'low';

export const GPU_CONTEXT_LIMITS: Record<GpuTier, number> = {
  high: 10,
  mid: 4,
  low: 2,
};

let cachedTier: GpuTier | null = null;
let cachedRenderer: string | null = null;

const HIGH_PATTERNS = [/nvidia.*rtx/i, /radeon\s*rx\s*[67]\d/i, /apple\s*m\d/i, /arc\s*a[789]/i];

const MID_PATTERNS = [
  /nvidia.*gtx/i,
  /nvidia.*quadro/i,
  /radeon\s*rx\s*[45]\d/i,
  /radeon\s*pro/i,
  /intel.*iris/i,
  /intel.*uhd/i,
  /arc\s*a[35]/i,
];

function classify(renderer: string): GpuTier {
  for (const pat of HIGH_PATTERNS) {
    if (pat.test(renderer)) return 'high';
  }
  for (const pat of MID_PATTERNS) {
    if (pat.test(renderer)) return 'mid';
  }
  return 'low';
}

function detect(): void {
  if (cachedTier !== null) return;

  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('webgl2');
    if (!gl) {
      cachedTier = 'low';
      cachedRenderer = 'unknown (no webgl)';
      return;
    }

    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    if (ext) {
      cachedRenderer = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) as string;
    } else {
      cachedRenderer = 'unknown (no debug info)';
    }

    // Release the probe context immediately
    gl.getExtension('WEBGL_lose_context')?.loseContext();

    cachedTier = classify(cachedRenderer);
  } catch {
    cachedTier = 'low';
    cachedRenderer = 'unknown (error)';
  }

  console.log(
    `[GpuTier] renderer="${cachedRenderer}" tier=${cachedTier} maxContexts=${GPU_CONTEXT_LIMITS[cachedTier]}`,
  );
}

// Run detection eagerly at module load
detect();

export function getGpuTier(): GpuTier {
  if (!cachedTier) detect();
  return cachedTier!;
}

export function getGpuRenderer(): string {
  if (!cachedRenderer) detect();
  return cachedRenderer!;
}

export function getMaxGpuContexts(): number {
  return GPU_CONTEXT_LIMITS[getGpuTier()];
}
