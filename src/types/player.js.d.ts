declare module "player.js" {
  export class Player {
    constructor(el: HTMLIFrameElement | string);
    on(event: string, cb: (value?: any) => void): void;
    off(event: string): void;
    setCurrentTime(seconds: number): void;
    getCurrentTime(cb: (seconds: number) => void): void;
    getDuration(cb: (seconds: number) => void): void;
    play(): void;
    pause(): void;
  }
  const playerjs: { Player: typeof Player };
  export default playerjs;
}
