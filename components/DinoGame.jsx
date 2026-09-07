"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { ArrowDown, RotateCcw, Play } from "lucide-react";
import PixelButton from "@/components/design-system/PixelButton";

// =============================================================================
// Web Audio 8-Bit Synthesizer for Classic Dino Arcade SFX
// =============================================================================
class DinoAudio {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  init() {
    if (typeof window === "undefined") return;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
  }

  jump() {
    if (!this.enabled || !this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "square";
      osc.frequency.setValueAtTime(320, t);
      osc.frequency.exponentialRampToValueAtTime(720, t + 0.09);
      gain.gain.setValueAtTime(0.06, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.09);
    } catch {
      // AudioContext blocked
    }
  }

  milestone() {
    if (!this.enabled || !this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "square";
      osc.frequency.setValueAtTime(587, t);
      osc.frequency.setValueAtTime(880, t + 0.08);
      gain.gain.setValueAtTime(0.08, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.22);
    } catch {}
  }

  crash() {
    if (!this.enabled || !this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(240, t);
      osc.frequency.exponentialRampToValueAtTime(40, t + 0.2);
      gain.gain.setValueAtTime(0.09, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.2);
    } catch {}
  }
}

// Global audio singleton
const sfx = new DinoAudio();

// =============================================================================
// Procedural Pixel Art Sprites
// =============================================================================
function drawPixelDino(ctx, x, y, width, height, state, frame, isNight) {
  ctx.save();
  ctx.fillStyle = isNight ? "#E2E8F0" : "#535353";

  // When ducking, adjust shape to lower profile
  if (state === "ducking") {
    // Ducking body
    ctx.fillRect(x, y + 10, width, height - 10);
    // Head forward
    ctx.fillRect(x + width - 12, y + 4, 18, 12);
    // Eye
    ctx.fillStyle = isNight ? "#121316" : "#FFFFFF";
    ctx.fillRect(x + width + 1, y + 6, 2, 2);
    // Legs (alternating)
    ctx.fillStyle = isNight ? "#E2E8F0" : "#535353";
    if (frame % 2 === 0) {
      ctx.fillRect(x + 6, y + height - 2, 4, 4);
      ctx.fillRect(x + 22, y + height - 4, 4, 2);
    } else {
      ctx.fillRect(x + 6, y + height - 4, 4, 2);
      ctx.fillRect(x + 22, y + height - 2, 4, 4);
    }
    ctx.restore();
    return;
  }

  // Normal Standing / Running / Jumping Body
  // Torso
  ctx.fillRect(x + 12, y + 14, 20, 20);
  // Back & Tail
  ctx.fillRect(x + 2, y + 18, 12, 10);
  ctx.fillRect(x, y + 20, 4, 4);
  // Neck
  ctx.fillRect(x + 22, y + 6, 12, 12);
  // Head & Snout
  ctx.fillRect(x + 22, y, 22, 12);
  ctx.fillRect(x + 36, y + 6, 8, 6);
  // Eye
  ctx.fillStyle = isNight ? "#121316" : "#FFFFFF";
  if (state === "dead") {
    // X Eye on crash
    ctx.fillRect(x + 28, y + 2, 3, 3);
    ctx.fillStyle = isNight ? "#E2E8F0" : "#535353";
    ctx.fillRect(x + 29, y + 3, 1, 1);
  } else {
    ctx.fillRect(x + 28, y + 2, 3, 3);
  }

  // Small arm
  ctx.fillStyle = isNight ? "#E2E8F0" : "#535353";
  ctx.fillRect(x + 32, y + 18, 6, 3);

  // Legs
  if (state === "jumping") {
    ctx.fillRect(x + 14, y + 34, 4, 8);
    ctx.fillRect(x + 24, y + 34, 4, 8);
  } else {
    // Running frame alternation
    if (frame % 2 === 0) {
      ctx.fillRect(x + 14, y + 34, 4, 8);
      ctx.fillRect(x + 14, y + 42, 6, 2);
      ctx.fillRect(x + 24, y + 34, 4, 4);
    } else {
      ctx.fillRect(x + 14, y + 34, 4, 4);
      ctx.fillRect(x + 24, y + 34, 4, 8);
      ctx.fillRect(x + 24, y + 42, 6, 2);
    }
  }

  ctx.restore();
}

function drawCactus(ctx, x, y, type, isNight) {
  ctx.save();
  ctx.fillStyle = isNight ? "#10B981" : "#0F9D58";

  if (type === "small") {
    // Main stem
    ctx.fillRect(x + 4, y, 6, 32);
    // Left arm
    ctx.fillRect(x, y + 8, 4, 12);
    ctx.fillRect(x, y + 8, 6, 4);
    // Right arm
    ctx.fillRect(x + 10, y + 12, 4, 10);
    ctx.fillRect(x + 8, y + 12, 6, 4);
  } else if (type === "double") {
    // First cactus
    ctx.fillRect(x + 3, y + 4, 5, 28);
    ctx.fillRect(x, y + 12, 4, 8);
    // Second cactus
    ctx.fillRect(x + 15, y, 6, 32);
    ctx.fillRect(x + 20, y + 10, 4, 10);
  } else {
    // Large triple / tall cactus
    ctx.fillRect(x + 8, y, 8, 44);
    ctx.fillRect(x + 1, y + 12, 7, 5);
    ctx.fillRect(x + 1, y + 8, 5, 14);
    ctx.fillRect(x + 16, y + 16, 7, 5);
    ctx.fillRect(x + 18, y + 12, 5, 16);
  }

  ctx.restore();
}

function drawPterodactyl(ctx, x, y, wingFrame, isNight) {
  ctx.save();
  ctx.fillStyle = isNight ? "#93C5FD" : "#4285F4";

  // Body
  ctx.fillRect(x + 10, y + 8, 16, 6);
  // Head & Beak
  ctx.fillRect(x, y + 6, 10, 4);
  ctx.fillRect(x - 4, y + 7, 4, 2);

  // Wings (Flapping 2-frame)
  if (wingFrame === 0) {
    // Wings Up
    ctx.fillRect(x + 14, y - 6, 6, 14);
    ctx.fillRect(x + 16, y - 10, 4, 4);
  } else {
    // Wings Down
    ctx.fillRect(x + 14, y + 12, 6, 12);
    ctx.fillRect(x + 16, y + 22, 4, 4);
  }

  ctx.restore();
}

export default function DinoGame({
  onScoreUpdate,
  onHighScoreUpdate,
  soundEnabled = true,
  className,
}) {
  const canvasRef = useRef(null);
  const keysRef = useRef({ jump: false, duck: false });
  const [gameState, setGameState] = useState("idle"); // "idle" | "playing" | "gameover"
  const [currentScore, setCurrentScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [isNightMode, setIsNightMode] = useState(false);

  // Synchronize audio mute setting
  useEffect(() => {
    sfx.enabled = soundEnabled;
  }, [soundEnabled]);

  // Load initial high score
  useEffect(() => {
    try {
      const saved = localStorage.getItem("gdg_dino_high_score");
      if (saved) {
        const val = Number(saved) || 0;
        setHighScore(val);
        if (onHighScoreUpdate) onHighScoreUpdate(val);
      }
    } catch {}

    // Also attempt fetching from user account if signed in
    fetch("/api/user/dino-score")
      .then((res) => res.json())
      .then((data) => {
        if (data?.highScore && data.highScore > 0) {
          setHighScore((prev) => Math.max(prev, data.highScore));
        }
      })
      .catch(() => {});
  }, [onHighScoreUpdate]);

  // Save new high score to server & local storage
  const persistScore = useCallback(
    async (score) => {
      if (score <= 0) return;
      try {
        const saved = Number(localStorage.getItem("gdg_dino_high_score") || 0);
        if (score > saved) {
          localStorage.setItem("gdg_dino_high_score", String(score));
          setHighScore(score);
          if (onHighScoreUpdate) onHighScoreUpdate(score);
        }
        // Send to backend (silently continues if offline/guest)
        fetch("/api/user/dino-score", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ score }),
        }).catch(() => {});
      } catch {}
    },
    [onHighScoreUpdate]
  );

  // Start / Restart Game Handler
  const startGame = useCallback(() => {
    sfx.init();
    setGameState("playing");
    setCurrentScore(0);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId;
    let score = 0;
    let speed = 5.5;
    let frameCount = 0;

    // Detect theme dynamically
    const isDocDark = typeof document !== "undefined" && document.documentElement.classList.contains("dark");
    let isNight = isDocDark;
    setIsNightMode(isNight);

    // Ground position for 960x240 canvas
    const groundY = 195;
    let groundOffset = 0;

    // Dino State
    const dino = {
      x: 45,
      y: groundY - 44,
      width: 44,
      height: 44,
      vy: 0,
      gravity: 0.6,
      jumpForce: -11.5,
      isGrounded: true,
      state: "running", // "running" | "jumping" | "ducking" | "dead"
      animFrame: 0,
    };

    // Clouds
    const clouds = [
      { x: 140, y: 40, speed: 0.5 },
      { x: 440, y: 60, speed: 0.4 },
      { x: 740, y: 35, speed: 0.6 },
    ];

    // Obstacles array
    let obstacles = [];
    let obstacleTimer = 0;

    // Input tracker
    const keys = keysRef.current;

    const isEditableElement = (el) => {
      if (!el) return false;
      const tag = el.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
    };

    const handleKeyDown = (e) => {
      if (isEditableElement(e.target)) return;

      if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW") {
        e.preventDefault();
        sfx.init();
        if (gameState === "idle" || gameState === "gameover") {
          startGame();
          keysRef.current.jump = true;
          return;
        }
        keysRef.current.jump = true;
      }
      if (e.code === "ArrowDown" || e.code === "KeyS") {
        e.preventDefault();
        keysRef.current.duck = true;
      }
    };

    const handleKeyUp = (e) => {
      if (isEditableElement(e.target)) return;

      if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW") {
        keysRef.current.jump = false;
        // Early release cuts upward jump arc for tactile jump control
        if (dino.vy < -4) {
          dino.vy = -4;
        }
      }
      if (e.code === "ArrowDown" || e.code === "KeyS") {
        keysRef.current.duck = false;
      }
    };

    const handleBlur = () => {
      keysRef.current.jump = false;
      keysRef.current.duck = false;
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleBlur);

    // Initial render for Idle state
    if (gameState !== "playing") {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Background fill matching current theme
      ctx.fillStyle = isNight ? "#090d16" : "#f8f9fa";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw Ground
      ctx.strokeStyle = isNight ? "#334155" : "#475569";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, groundY);
      ctx.lineTo(canvas.width, groundY);
      ctx.stroke();

      // Draw gravel dashes
      ctx.fillStyle = isNight ? "#475569" : "#94a3b8";
      for (let i = 0; i < canvas.width; i += 24) {
        ctx.fillRect(i, groundY + 4, 3, 1);
        if (i % 48 === 0) {
          ctx.fillRect(i + 8, groundY + 8, 4, 1);
        }
      }

      // Draw idle dino
      drawPixelDino(ctx, dino.x, dino.y, dino.width, dino.height, "running", 0, isNight);
      return () => {
        window.removeEventListener("keydown", handleKeyDown);
        window.removeEventListener("keyup", handleKeyUp);
      };
    }

    // Main 60 FPS Game Loop
    const loop = () => {
      frameCount++;

      // Increment score
      if (frameCount % 5 === 0) {
        score++;
        setCurrentScore(score);
        if (onScoreUpdate) onScoreUpdate(score);

        // Milestone chime every 100 points
        if (score % 100 === 0) {
          sfx.milestone();
        }

        // Gradual speed acceleration (max speed: 12.5)
        if (score % 80 === 0 && speed < 12.5) {
          speed += 0.35;
        }

        // Day / Night cycle switch every 400 points
        const shouldBeNight = Math.floor(score / 400) % 2 === 1 ? !isDocDark : isDocDark;
        if (shouldBeNight !== isNight) {
          isNight = shouldBeNight;
          setIsNightMode(isNight);
        }
      }

      // Handle Dino Physics
      if (keys.jump && dino.isGrounded) {
        dino.vy = dino.jumpForce;
        dino.isGrounded = false;
        dino.state = "jumping";
        sfx.jump();
      }

      if (keys.duck && dino.isGrounded) {
        dino.state = "ducking";
        dino.height = 26;
        dino.y = groundY - 26;
      } else if (!dino.isGrounded) {
        dino.state = "jumping";
        dino.height = 44;
      } else {
        dino.state = "running";
        dino.height = 44;
        dino.y = groundY - 44;
      }

      // Apply Gravity
      if (!dino.isGrounded) {
        dino.vy += dino.gravity;
        dino.y += dino.vy;

        // Fast fall on duck in mid-air
        if (keys.duck) {
          dino.vy += 0.8;
        }

        // Floor collision
        if (dino.y >= groundY - dino.height) {
          dino.y = groundY - dino.height;
          dino.vy = 0;
          dino.isGrounded = true;
          dino.state = keys.duck ? "ducking" : "running";
        }
      }

      // Cycle animation frame
      if (frameCount % 7 === 0) {
        dino.animFrame = (dino.animFrame + 1) % 2;
      }

      // Move Ground Texture
      groundOffset = (groundOffset + speed) % 24;

      // Update Clouds
      clouds.forEach((cloud) => {
        cloud.x -= cloud.speed;
        if (cloud.x < -60) cloud.x = canvas.width + 40;
      });

      // Spawn Obstacles
      obstacleTimer++;
      const minSpawnInterval = Math.max(50, 110 - Math.floor(speed * 4));
      if (obstacleTimer > minSpawnInterval && Math.random() < 0.04) {
        obstacleTimer = 0;
        // Pterodactyls appear once score > 150
        const spawnPterodactyl = score > 150 && Math.random() < 0.35;

        if (spawnPterodactyl) {
          // Height: Low (jump), Mid (duck), High (pass)
          const heights = [groundY - 34, groundY - 55, groundY - 76];
          const yPos = heights[Math.floor(Math.random() * heights.length)];
          obstacles.push({
            type: "pterodactyl",
            x: canvas.width + 20,
            y: yPos,
            width: 32,
            height: 22,
            wingFrame: 0,
            passed: false,
          });
        } else {
          // Spawn Cactus
          const types = ["small", "double", "large"];
          const subType = types[Math.floor(Math.random() * types.length)];
          let width = 14;
          let height = 32;
          if (subType === "double") width = 26;
          if (subType === "large") {
            width = 24;
            height = 44;
          }

          obstacles.push({
            type: "cactus",
            subType,
            x: canvas.width + 20,
            y: groundY - height,
            width,
            height,
            passed: false,
          });
        }
      }

      // Move Obstacles & Check Collisions
      let hasCrashed = false;
      for (let i = obstacles.length - 1; i >= 0; i--) {
        const obs = obstacles[i];
        obs.x -= speed;

        // Animate Pterodactyl wings
        if (obs.type === "pterodactyl" && frameCount % 10 === 0) {
          obs.wingFrame = (obs.wingFrame + 1) % 2;
        }

        // Accurate Hitbox Collision Calculation (with 4px forgiveness buffer)
        const buffer = 4;
        const dinoLeft = dino.x + buffer;
        const dinoRight = dino.x + dino.width - buffer;
        const dinoTop = dino.y + buffer;
        const dinoBottom = dino.y + dino.height - buffer;

        const obsLeft = obs.x + buffer;
        const obsRight = obs.x + obs.width - buffer;
        const obsTop = obs.y + buffer;
        const obsBottom = obs.y + obs.height - buffer;

        if (
          dinoRight > obsLeft &&
          dinoLeft < obsRight &&
          dinoBottom > obsTop &&
          dinoTop < obsBottom
        ) {
          hasCrashed = true;
          break;
        }
      }
      obstacles = obstacles.filter((obs) => obs.x > -60);

      // =========================================================================
      // Render Frame
      // =========================================================================
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Canvas background fill (Night / Day)
      ctx.fillStyle = isNight ? "#090d16" : "#f8f9fa";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Night mode stars
      if (isNight) {
        ctx.fillStyle = "#E2E8F0";
        ctx.fillRect(100, 25, 2, 2);
        ctx.fillRect(240, 45, 1, 1);
        ctx.fillRect(420, 20, 2, 2);
        ctx.fillRect(620, 40, 1, 1);
        ctx.fillRect(800, 28, 2, 2);
      }

      // Draw Clouds
      ctx.fillStyle = isNight ? "#1e293b" : "#cbd5e1";
      clouds.forEach((cloud) => {
        ctx.fillRect(cloud.x, cloud.y, 40, 10);
        ctx.fillRect(cloud.x + 8, cloud.y - 6, 24, 6);
      });

      // Draw Ground
      ctx.strokeStyle = isNight ? "#334155" : "#475569";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, groundY);
      ctx.lineTo(canvas.width, groundY);
      ctx.stroke();

      // Draw gravel ground dashes
      ctx.fillStyle = isNight ? "#475569" : "#94a3b8";
      for (let i = -groundOffset; i < canvas.width; i += 24) {
        ctx.fillRect(i, groundY + 4, 3, 1);
        if (i % 48 === 0) {
          ctx.fillRect(i + 8, groundY + 8, 4, 1);
        }
      }

      // Draw Obstacles
      obstacles.forEach((obs) => {
        if (obs.type === "cactus") {
          drawCactus(ctx, obs.x, obs.y, obs.subType, isNight);
        } else {
          drawPterodactyl(ctx, obs.x, obs.y, obs.wingFrame, isNight);
        }
      });

      // Draw Dino
      drawPixelDino(
        ctx,
        dino.x,
        dino.y,
        dino.width,
        dino.height,
        dino.state,
        dino.animFrame,
        isNight
      );

      // Handle Game Over
      if (hasCrashed) {
        sfx.crash();
        setGameState("gameover");
        persistScore(score);

        // Draw Crash Frame
        drawPixelDino(ctx, dino.x, dino.y, dino.width, dino.height, "dead", 0, isNight);
        return;
      }

      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleBlur);
    };
  }, [gameState, onScoreUpdate, persistScore, startGame]);

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden border-2 border-border/80 bg-card shadow-pixel-sm select-none",
        isNightMode && "border-border bg-card",
        className
      )}
    >
      {/* Interactive Arcade Canvas (960x240 widescreen) */}
      <canvas
        ref={canvasRef}
        width={960}
        height={240}
        onClick={() => {
          sfx.init();
          if (gameState !== "playing") startGame();
        }}
        className="w-full h-auto cursor-pointer block touch-none"
      />

      {/* CRT Scanline Overlay */}
      <div className="scanline-overlay pointer-events-none absolute inset-0 opacity-20" />

      {/* Start / Idle Overlay */}
      {gameState === "idle" && (
        <div
          onClick={startGame}
          className="absolute inset-0 flex flex-col items-center justify-center bg-background/50 backdrop-blur-[2px] cursor-pointer z-20"
        >
          <div className="text-center p-4">
            <div className="inline-flex items-center gap-2 mb-2 px-3 py-1 bg-card border-2 border-foreground/80 text-foreground font-pixel text-[11px] shadow-pixel-sm">
              <Play className="h-3.5 w-3.5 fill-current text-emerald-500" />
              <span>ARCADE STATION READY</span>
            </div>
            <p className="font-pixel text-xs text-foreground tracking-wider mt-2 animate-pulse">
              PRESS SPACE OR TAP TO RUN
            </p>
            <p className="text-xs text-muted-foreground mt-1 font-sans font-medium">
              Jump over cacti · Duck under pterodactyls · Bank your score
            </p>
          </div>
        </div>
      )}

      {/* Game Over Overlay */}
      {gameState === "gameover" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-[3px] z-20">
          <div className="text-center p-4">
            <h3 className="font-pixel text-base sm:text-lg text-rose-500 tracking-wider mb-2">
              GAME OVER
            </h3>
            <p className="font-pixel text-xs text-zinc-200 mb-4">
              FINAL SCORE: <span className="text-emerald-400">{currentScore}</span>
              {currentScore >= highScore && currentScore > 0 && (
                <span className="text-amber-400 ml-2">★ NEW HIGH SCORE!</span>
              )}
            </p>
            <PixelButton
              variant="arcade"
              size="sm"
              icon={RotateCcw}
              onClick={startGame}
              className="mx-auto"
            >
              PLAY AGAIN
            </PixelButton>
          </div>
        </div>
      )}

      {/* Mobile Touch Action Bar */}
      <div className="sm:hidden flex items-center justify-between p-2 border-t border-border/40 bg-muted/40 z-10">
        <button
          type="button"
          onTouchStart={() => {
            sfx.init();
            if (gameState !== "playing") startGame();
            keysRef.current.jump = true;
            window.dispatchEvent(new KeyboardEvent("keydown", { code: "Space" }));
          }}
          onTouchEnd={() => {
            keysRef.current.jump = false;
            window.dispatchEvent(new KeyboardEvent("keyup", { code: "Space" }));
          }}
          onTouchCancel={() => {
            keysRef.current.jump = false;
            window.dispatchEvent(new KeyboardEvent("keyup", { code: "Space" }));
          }}
          className="flex-1 py-2 font-pixel text-[10px] bg-foreground text-background border border-foreground text-center active:bg-foreground/80 mr-2"
        >
          ▲ JUMP
        </button>
        <button
          type="button"
          onTouchStart={() => {
            sfx.init();
            if (gameState !== "playing") startGame();
            keysRef.current.duck = true;
            window.dispatchEvent(new KeyboardEvent("keydown", { code: "ArrowDown" }));
          }}
          onTouchEnd={() => {
            keysRef.current.duck = false;
            window.dispatchEvent(new KeyboardEvent("keyup", { code: "ArrowDown" }));
          }}
          onTouchCancel={() => {
            keysRef.current.duck = false;
            window.dispatchEvent(new KeyboardEvent("keyup", { code: "ArrowDown" }));
          }}
          className="flex-1 py-2 font-pixel text-[10px] bg-muted border border-border text-center active:bg-muted/60"
        >
          ▼ DUCK
        </button>
      </div>
    </div>
  );
}
