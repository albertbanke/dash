import { getMaxGpuContexts } from './GpuTierDetector';

class GpuContextBudgetImpl {
  private activeCount = 0;
  private maxContexts: number;

  constructor() {
    this.maxContexts = getMaxGpuContexts();
  }

  canAllocate(): boolean {
    return this.activeCount < this.maxContexts;
  }

  allocate(): void {
    this.activeCount++;
  }

  release(): void {
    if (this.activeCount > 0) this.activeCount--;
  }

  get current(): number {
    return this.activeCount;
  }

  get limit(): number {
    return this.maxContexts;
  }
}

export const gpuContextBudget = new GpuContextBudgetImpl();
