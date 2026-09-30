import { useEffect } from "react";
import { MainMenu, SettingsScreen } from "@/components/MainMenu";
import { GameScreen } from "@/components/GameScreen";
import { useSession } from "@/store/session";
import { useCheats } from "@/store/cheats";

export function App() {
  const screen = useSession((s) => s.screen);

  useEffect(() => {
    window.__havoc = {
      play: (mode, team) => useSession.getState().startMatch({ mode, team }),
      cheats: () => useCheats.getState().toggleMenu(),
      cfg: () => useCheats.getState().cfg,
    };
  }, []);

  if (screen === "settings") return <SettingsScreen />;
  if (screen === "match") return <GameScreen />;
  return <MainMenu />;
}
