"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import type { GameStatus } from "../src/game/config";

const PhaserGame = dynamic(() => import("../src/game/phaser-game"), {
  ssr: false,
});

export default function Home() {
  const [gameStatus, setGameStatus] = useState<GameStatus | null>(null);
  const [hasStarted, setHasStarted] = useState(false);

  if (!hasStarted) {
    return (
      <div
        className="relative min-h-screen w-full overflow-hidden"
        style={{
          backgroundImage: "url(/start-bg.png)",
          backgroundSize: "cover",
          backgroundPosition: "center top",
          backgroundRepeat: "no-repeat",
        }}
      >
        <div className="pointer-events-none absolute inset-0 flex items-end justify-center px-4 pb-[min(30vh,220px)] sm:pb-[min(34vh,240px)]">
          <button
            type="button"
            onClick={() => setHasStarted(true)}
            className="pointer-events-auto p-0 border-0 bg-transparent cursor-pointer hover:opacity-90 active:opacity-80 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent rounded-md max-w-[min(72vw,420px)] w-full"
            aria-label="Start game"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- small UI asset, no layout shift */}
            <img
              src="/start-btn.png"
              alt=""
              className="mx-auto block h-auto w-full max-h-[min(14vh,120px)] sm:max-h-[min(16vh,140px)] object-contain"
              draggable={false}
            />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-10 bg-slate-950 text-slate-50 font-sans overflow-hidden">
      <div className="absolute inset-0">
        <PhaserGame
          onStatusChange={(status) => {
            setGameStatus(status);
          }}
        />
      </div>

      {gameStatus &&
        (gameStatus.state === "won" ||
          gameStatus.state === "lost_lives" ||
          gameStatus.state === "lost_time") && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-center pb-[max(1rem,env(safe-area-inset-bottom))] pt-8 bg-gradient-to-t from-slate-950/95 to-transparent">
            <div className="pointer-events-auto text-center px-4">
              <p className="text-sm text-slate-200 mb-2">
                Boss HP removed:{" "}
                <span className="font-semibold text-cyan-300">
                  {100 - (gameStatus.bossHp / gameStatus.bossMaxHp) * 100}%
                </span>
              </p>
              <button
                type="button"
                className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-slate-800 hover:bg-slate-700 text-sm font-medium"
                onClick={() => {
                  setHasStarted(false);
                  setGameStatus(null);
                }}
              >
                Play again
              </button>
            </div>
          </div>
        )}
    </div>
  );
}
