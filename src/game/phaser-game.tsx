"use client";

import { useEffect, useRef } from "react";
import Phaser from "phaser";
import { MainScene, type OnGameStatusChange } from "./MainScene";
import { GAME_HEIGHT, GAME_WIDTH } from "./config";

interface Props {
  onStatusChange?: OnGameStatusChange;
}

export default function PhaserGame({ onStatusChange }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const statusChangeRef = useRef<OnGameStatusChange | undefined>(undefined);

  useEffect(() => {
    statusChangeRef.current = onStatusChange;
  }, [onStatusChange]);

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: GAME_WIDTH,
      height: GAME_HEIGHT,
      backgroundColor: "#020617",
      parent: containerRef.current,
      physics: {
        default: "arcade",
        arcade: {
          gravity: { x: 0, y: 0 },
          debug: false,
        },
      },
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      scene: [MainScene],
    };

    const game = new Phaser.Game(config);
    gameRef.current = game;

    game.scene.start("MainScene", {
      onStatusChange: (
        status: Parameters<NonNullable<OnGameStatusChange>>[0],
      ) => statusChangeRef.current?.(status),
    });

    return () => {
      game.destroy(true);
      gameRef.current = null;
    };
  }, []);

  return <div ref={containerRef} className="w-full h-full" />;
}
