export interface ActiveTimer {
  stepOrder: number;
  instruction: string;
  initialSeconds: number;
  timeLeft: number;
  isRunning: boolean;
}
