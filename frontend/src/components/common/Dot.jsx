import React from "react";
import { COLORS as C } from "../../styles/theme.js";
import { STATUT } from "../../data/constants.js";

export default function Dot({ statut }) {
  const color =
    statut === STATUT.EN_COURS
      ? C.green
      : statut === STATUT.CREATION || statut === STATUT.DESTRUCTION
      ? C.amber
      : statut === STATUT.EN_ERREUR
      ? C.rust
      : C.inkFaint;

  return (
    <span style={{ position: "relative", display: "inline-flex", width: 8, height: 8 }}>
      <span style={{ width: 8, height: 8, background: color, display: "block" }} />
      {statut === STATUT.EN_COURS && (
        <span
          style={{
            position: "absolute",
            inset: 0,
            background: color,
            animation: "pulse-ring 1.8s ease-out infinite",
          }}
        />
      )}
    </span>
  );
}
