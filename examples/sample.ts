interface Point {
  x: number;
  y: number;
}

export const distance = (a: Point, b: Point): number => Math.hypot(a.x - b.x, a.y - b.y);

export class Router {
  private routes = new Map<string, (path: string) => string>();

  resolve(path: string, fallback?: string): string {
    const handler = this.routes.get(path);
    if (!handler) return fallback ?? '404';
    return handler(path);
  }
}
