'use client';

import GameCanvas from "./_components/game-canvas";

export default function Page() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-linear-to-b from-blue-800 to-blue-950">
      <GameCanvas />
    </div>
  )
}