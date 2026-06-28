// ============================================================================
// BattleScene — the turn-based encounter for Creature Quest (Phase 3.3).
// A wild creature = a skill domain. The player picks a move = a project
// (original names, from data/quest.js). The move tied to THIS battle is
// always "effective" (one hit, instant win); any move "borrowed" from an
// earlier victory does a small graze hit instead — no fail state, the player
// always wins, this is a portfolio, not a punishing battler.
// ============================================================================

import { useState } from "react";
import { Html } from "@react-three/drei";
import { Facing } from "./Surfaces.jsx";

export default function BattleScene({ battle, unlockedMoves, anchor, onWin, onClose }) {
  const [hp, setHp] = useState(100);
  const [log, setLog] = useState(`A wild ${battle.opponent.name} — discipline: ${battle.opponent.discipline} — blocks the path!`);
  const [won, setWon] = useState(false);

  const moves = [
    { label: battle.move, effective: true },
    ...unlockedMoves.filter((m) => m !== battle.move).map((m) => ({ label: m, effective: false })),
  ];

  function useMove(m) {
    if (won) return;
    if (m.effective) {
      setHp(0);
      setLog(`${m.label} lands clean — ${battle.opponent.name} is out!`);
      setWon(true);
    } else {
      const next = Math.max(0, hp - 25);
      setHp(next);
      setLog(`${m.label} grazes it. ${battle.opponent.name}: "${battle.opponent.line}"`);
      if (next <= 0) {
        setLog(`${m.label} finishes it — ${battle.opponent.name} is out!`);
        setWon(true);
      }
    }
  }

  return (
    <Facing position={anchor}>
      <Html transform distanceFactor={6.5} style={{ pointerEvents: "auto" }} zIndexRange={[22, 0]}>
        <div className="battle-panel" style={{ borderColor: battle.opponent.color }}>
          <div className="term-bar">
            <span className="term-dot" />
            <span className="term-dot" />
            <span className="term-dot" />
            <span className="term-title">
              {battle.boss ? "BOSS — " : "ENCOUNTER — "}
              {battle.opponent.name}
            </span>
            <button className="term-close" onClick={onClose} aria-label="Close">
              ✕
            </button>
          </div>

          <div className="battle-body">
            <div className="battle-hprow">
              <span style={{ color: battle.opponent.color }}>{battle.opponent.name}</span>
              <span className="battle-discipline">{battle.opponent.discipline}</span>
            </div>
            <div className="battle-hpbar">
              <div
                className="battle-hpfill"
                style={{ width: `${hp}%`, background: battle.opponent.color }}
              />
            </div>

            <p className="battle-log">{log}</p>

            {!won ? (
              <div className="battle-moves">
                {moves.map((m) => (
                  <button key={m.label} className="battle-move-btn" onClick={() => useMove(m)}>
                    {m.label}
                    {m.effective && <span className="battle-tag">your move</span>}
                  </button>
                ))}
              </div>
            ) : (
              <div className="battle-victory">
                <h3 style={{ color: battle.opponent.color }}>
                  {battle.project.name}
                  {battle.boss ? " ★" : ""}
                </h3>
                <p className="note">{battle.flavor}</p>
                <p className="battle-status">{battle.project.status}</p>
                {battle.badge && <p className="battle-badge">🏅 {battle.badge} earned</p>}
                <button className="battle-move-btn battle-continue" onClick={() => onWin(battle)}>
                  Continue ▸
                </button>
              </div>
            )}
          </div>
        </div>
      </Html>
    </Facing>
  );
}
