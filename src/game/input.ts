export class GameInput {
  keys = new Set<string>();
  injected = new Set<string>();
  mouseDx = 0;
  mouseDy = 0;
  fireHeld = false;
  adsHeld = false;
  jumpHeld = false;
  crouchHeld = false;
  reloadTap = false;
  weaponSlot: 1 | 2 | null = null;
  moveX = 0;
  moveY = 0;
  joystick = { x: 0, y: 0, active: false };
  private mouseFire = false;
  private mouseAds = false;
  private touchFire = false;
  private touchJump = false;
  private touchCrouch = false;
  private touchAds = false;
  private el: HTMLElement | null = null;
  private pointers = new Map<
    number,
    { kind: "look" | "move" | "btn"; x: number; y: number; sx: number; sy: number }
  >();

  attach(el: HTMLElement) {
    this.el = el;
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("blur", this.clear);
    document.addEventListener("visibilitychange", this.onVis);
    el.addEventListener("mousemove", this.onMouseMove);
    el.addEventListener("mousedown", this.onMouseDown);
    window.addEventListener("mouseup", this.onMouseUp);
    el.addEventListener("contextmenu", this.onContext);
    el.addEventListener("pointerdown", this.onPointerDown);
    el.addEventListener("pointermove", this.onPointerMove);
    el.addEventListener("pointerup", this.onPointerUp);
    el.addEventListener("pointercancel", this.onPointerUp);
  }

  detach() {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("blur", this.clear);
    document.removeEventListener("visibilitychange", this.onVis);
    if (this.el) {
      this.el.removeEventListener("mousemove", this.onMouseMove);
      this.el.removeEventListener("mousedown", this.onMouseDown);
      this.el.removeEventListener("contextmenu", this.onContext);
      this.el.removeEventListener("pointerdown", this.onPointerDown);
      this.el.removeEventListener("pointermove", this.onPointerMove);
      this.el.removeEventListener("pointerup", this.onPointerUp);
      this.el.removeEventListener("pointercancel", this.onPointerUp);
    }
    window.removeEventListener("mouseup", this.onMouseUp);
    this.el = null;
  }

  setKeys(codes: string[]) {
    this.injected = new Set(codes);
    this.fireHeld = codes.includes("Mouse0");
    this.jumpHeld = codes.includes("Space");
  }

  has(code: string) {
    return this.keys.has(code) || this.injected.has(code);
  }

  consumeMouse() {
    const dx = this.mouseDx;
    const dy = this.mouseDy;
    this.mouseDx = 0;
    this.mouseDy = 0;
    return { dx, dy };
  }

  consumeTaps() {
    const reload = this.reloadTap;
    const slot = this.weaponSlot;
    this.reloadTap = false;
    this.weaponSlot = null;
    return { reload, slot };
  }

  poll() {
    let ix = 0;
    let iy = 0;
    if (this.has("KeyW") || this.has("ArrowUp")) iy += 1;
    if (this.has("KeyS") || this.has("ArrowDown")) iy -= 1;
    if (this.has("KeyD") || this.has("ArrowRight")) ix += 1;
    if (this.has("KeyA") || this.has("ArrowLeft")) ix -= 1;
    if (this.joystick.active) {
      ix += this.joystick.x;
      iy += this.joystick.y;
    }
    const pads = typeof navigator !== "undefined" ? navigator.getGamepads?.() : null;
    if (pads) {
      for (const p of pads) {
        if (!p || p.mapping !== "standard") continue;
        const lx = p.axes[0] ?? 0;
        const ly = p.axes[1] ?? 0;
        const mag = Math.hypot(lx, ly);
        if (mag > 0.18) {
          const s = (mag - 0.18) / 0.82;
          ix += (lx / mag) * s;
          iy += (-ly / mag) * s;
        }
        const rx = p.axes[2] ?? 0;
        const ry = p.axes[3] ?? 0;
        const rm = Math.hypot(rx, ry);
        if (rm > 0.12) {
          this.mouseDx += rx * 14;
          this.mouseDy += ry * 14;
        }
        if (p.buttons[7]?.value && p.buttons[7].value > 0.4) this.touchFire = true;
        if (p.buttons[6]?.value && p.buttons[6].value > 0.4) this.touchAds = true;
        if (p.buttons[0]?.pressed) this.touchJump = true;
        if (p.buttons[1]?.pressed) this.touchCrouch = true;
      }
    }
    const len = Math.hypot(ix, iy);
    if (len > 1) {
      ix /= len;
      iy /= len;
    }
    this.moveX = ix;
    this.moveY = iy;
    this.jumpHeld = this.has("Space") || this.touchJump;
    this.crouchHeld =
      this.has("ControlLeft") || this.has("ControlRight") || this.has("KeyC") || this.touchCrouch;
    this.fireHeld = this.mouseFire || this.touchFire || this.has("Mouse0");
    this.adsHeld = this.mouseAds || this.touchAds || this.has("Mouse2");
  }

  private onKeyDown = (e: KeyboardEvent) => {
    if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) {
      e.preventDefault();
    }
    this.keys.add(e.code);
    if (e.code === "KeyR") this.reloadTap = true;
    if (e.code === "Digit1") this.weaponSlot = 1;
    if (e.code === "Digit2") this.weaponSlot = 2;
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.code);
  };

  private onVis = () => {
    if (document.hidden) this.clear();
  };

  clear = () => {
    this.keys.clear();
    this.mouseFire = false;
    this.mouseAds = false;
    this.touchFire = false;
    this.touchJump = false;
    this.touchCrouch = false;
    this.touchAds = false;
    this.fireHeld = false;
    this.adsHeld = false;
    this.jumpHeld = false;
    this.crouchHeld = false;
  };

  private onMouseMove = (e: MouseEvent) => {
    if (document.pointerLockElement) {
      this.mouseDx += e.movementX;
      this.mouseDy += e.movementY;
    }
  };

  private onMouseDown = (e: MouseEvent) => {
    if (e.button === 0) {
      this.mouseFire = true;
      this.keys.add("Mouse0");
    }
    if (e.button === 2) {
      this.mouseAds = true;
      this.keys.add("Mouse2");
    }
  };

  private onMouseUp = (e: MouseEvent) => {
    if (e.button === 0) {
      this.mouseFire = false;
      this.keys.delete("Mouse0");
    }
    if (e.button === 2) {
      this.mouseAds = false;
      this.keys.delete("Mouse2");
    }
  };

  private onContext = (e: Event) => e.preventDefault();

  private onPointerDown = (e: PointerEvent) => {
    if (e.pointerType === "mouse") return;
    const target = e.target as HTMLElement | null;
    const action = target?.closest?.("[data-action]")?.getAttribute("data-action") ?? target?.dataset?.action;
    if (action === "fire") {
      this.touchFire = true;
      return;
    }
    if (action === "jump") {
      this.touchJump = true;
      return;
    }
    if (action === "crouch") {
      this.touchCrouch = true;
      return;
    }
    if (action === "reload") {
      this.reloadTap = true;
      return;
    }
    if (action === "ads") {
      this.touchAds = true;
      return;
    }
    if (action === "nl" || action === "score") return;
    const rect = this.el?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const kind = x < rect.width * 0.46 ? "move" : "look";
    this.pointers.set(e.pointerId, { kind, x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY });
    if (kind === "move") this.joystick.active = true;
    try {
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  private onPointerMove = (e: PointerEvent) => {
    const p = this.pointers.get(e.pointerId);
    if (!p) return;
    if (p.kind === "look") {
      this.mouseDx += e.clientX - p.x;
      this.mouseDy += e.clientY - p.y;
      p.x = e.clientX;
      p.y = e.clientY;
    } else if (p.kind === "move") {
      const dx = e.clientX - p.sx;
      const dy = e.clientY - p.sy;
      const max = 54;
      const nx = Math.max(-1, Math.min(1, dx / max));
      const ny = Math.max(-1, Math.min(1, -dy / max));
      this.joystick.x = nx;
      this.joystick.y = ny;
      this.joystick.active = true;
    }
  };

  private onPointerUp = (e: PointerEvent) => {
    const target = e.target as HTMLElement | null;
    const action = target?.closest?.("[data-action]")?.getAttribute("data-action") ?? target?.dataset?.action;
    if (action === "fire") this.touchFire = false;
    if (action === "jump") this.touchJump = false;
    if (action === "crouch") this.touchCrouch = false;
    if (action === "ads") this.touchAds = false;
    const p = this.pointers.get(e.pointerId);
    if (p?.kind === "move") {
      this.joystick = { x: 0, y: 0, active: false };
    }
    this.pointers.delete(e.pointerId);
  };
}
