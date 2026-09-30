import { useEffect, useRef } from "react";
import { HUD, NlButton } from "@/components/HUD";
import { CheatMenu } from "@/components/CheatMenu";
import { MobileControls } from "@/components/MobileControls";
import { useSession } from "@/store/session";
import { useCheats } from "@/store/cheats";
import type { HavocGame } from "@/game/engine";

export function GameScreen() {
  const hostRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<HavocGame | null>(null);
  const mode = useSession((s) => s.mode);
  const team = useSession((s) => s.team);
  const clickToPlay = useSession((s) => s.clickToPlay);
  const setClickToPlay = useSession((s) => s.setClickToPlay);
  const setIsTouch = useSession((s) => s.setIsTouch);
  const setScoreboard = useSession((s) => s.setScoreboard);
  const menuOpen = useCheats((s) => s.menuOpen);

  useEffect(() => {
    const coarse = window.matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 0;
    setIsTouch(coarse);
  }, [setIsTouch]);

  useEffect(() => {
    const host = hostRef.current;
    const world = worldRef.current;
    const overlay = overlayRef.current;
    if (!host || !world || !overlay || !mode || !team) return;
    let game: HavocGame | null = null;
    let dead = false;
    import("@/game/engine").then(({ HavocGame }) => {
      if (dead) return;
      game = new HavocGame(world, overlay, host);
      game.start({ mode, team });
      gameRef.current = game;
    });
    return () => {
      dead = true;
      game?.dispose();
      gameRef.current = null;
    };
  }, [mode, team]);

  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      if (e.code === "Tab") {
        e.preventDefault();
        setScoreboard(true);
      }
    };
    const onUp = (e: KeyboardEvent) => {
      if (e.code === "Tab") {
        e.preventDefault();
        setScoreboard(false);
      }
    };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
  }, [setScoreboard]);

  const onPlay = () => {
    gameRef.current?.tryLock();
    setClickToPlay(false);
  };

  return (
    <div
      ref={hostRef}
      className="relative h-dvh w-full overflow-hidden bg-bg"
      style={{ touchAction: "none" }}
    >
      <canvas ref={worldRef} className="absolute inset-0 h-full w-full" />
      <canvas ref={overlayRef} className="pointer-events-none absolute inset-0 h-full w-full" />
      <HUD />
      <MobileControls />
      <NlButton />
      <CheatMenu />
      {clickToPlay && !menuOpen ? (
        <button
          type="button"
          onClick={onPlay}
          className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-bg/70 text-center"
        >
          <span className="font-display text-5xl font-semibold tracking-tight">Кликните, чтобы играть</span>
          <span className="mt-3 max-w-sm px-6 text-sm text-muted">
            WASD · мышь · ЛКМ стрельба · Insert меню чита · на телефоне стик и FIRE
          </span>
        </button>
      ) : null}
    </div>
  );
}
