/**
 * Test double for `next/server`.
 *
 * next-auth's env module imports it while resolving `CredentialsSignin`, which
 * some suites need. Nothing here talks to a real request.
 */
export class NextResponse {
  constructor(body, init = {}) {
    this.body = body;
    this.status = init.status ?? 200;
  }

  static json(body, init) {
    return new NextResponse(body, init);
  }

  async json() {
    return this.body;
  }
}

export const NextRequest = class {};

export class NextURL extends URL {}
