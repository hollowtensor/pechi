import { useEffect, useRef } from "react";
import type { AppState } from "../types";
import { ParticleSystem } from "../particles/ParticleSystem";

interface Props {
  state: AppState;
}

export function ParticleBackground({ state }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const systemRef = useRef<ParticleSystem | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const system = new ParticleSystem(canvas);
    systemRef.current = system;
    system.start();

    const onResize = () => system.resize();
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      system.destroy();
      systemRef.current = null;
    };
  }, []);

  useEffect(() => {
    systemRef.current?.setState(state);
  }, [state]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        zIndex: 0,
      }}
    />
  );
}
