'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import type { GameStatus } from '../src/game/config';

const PhaserGame = dynamic(() => import('../src/game/phaser-game'), {
  ssr: false,
});

export default function Home() {
  const [gameStatus, setGameStatus] = useState<GameStatus | null>(null);
  const [hasStarted, setHasStarted] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 font-sans flex flex-col items-center justify-center py-8 px-4">
      <main className="w-full max-w-5xl">
        <header className="text-center mb-6">
          <div className="inline-flex items-center gap-3 mb-3">
            <div className="h-9 w-9 rounded-full bg-cyan-500 flex items-center justify-center text-slate-950 font-bold text-xl">
              S
            </div>
            <span className="text-sm tracking-wide uppercase text-cyan-300">
              Enosta mini game @ DevDay
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">
            StaPi vs The Bugs
          </h1>
        </header>

        {!hasStarted && (
          <section className="bg-slate-900/80 border border-slate-700 rounded-2xl p-5 mb-5 flex flex-col md:flex-row gap-6">
            <div className="flex-1 space-y-3">
              <h2 className="text-xl font-semibold text-cyan-300">
                How to play
              </h2>
              <ul className="text-sm leading-relaxed text-slate-200 space-y-1.5 list-disc list-inside">
                <li>
                  Move the mouse left and right to dodge the Bugs in the lower
                  half of the screen.
                </li>
                <li>
                  Left click to shoot &lt;code/&gt; upwards and help StaPi
                  defeat the Bug Boss.
                </li>
                <li>
                  You have 3 lives and{" "}
                  <span className="font-semibold">
                    {gameStatus?.timeLeft ?? 30}s
                  </span>{" "}
                  to drain the Boss HP.
                </li>
              </ul>
            </div>
            <div className="flex flex-col items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setHasStarted(true)}
                className="px-8 py-3 rounded-full bg-cyan-400 text-slate-950 font-semibold text-lg shadow-lg shadow-cyan-500/30 hover:bg-cyan-300 transition-colors"
              >
                Start Game
              </button>
              <p className="text-xs text-slate-400 max-w-xs text-center">
                After clicking Start, watch the 3 second countdown.
              </p>
            </div>
          </section>
        )}

        <section className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3">
          <div className="aspect-[16/9] w-full bg-slate-950 rounded-xl overflow-hidden relative">
            {hasStarted ? (
              <PhaserGame
                onStatusChange={(status) => {
                  setGameStatus(status);
                }}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-slate-500 text-sm">
                Click Start to launch the game.
              </div>
            )}
          </div>
        </section>

        {gameStatus && (gameStatus.state === 'won' ||
          gameStatus.state === 'lost_lives' ||
          gameStatus.state === 'lost_time') && (
          <section className="mt-4 text-center">
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
          </section>
        )}
      </main>
    </div>
  );
}

