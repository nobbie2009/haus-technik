import { Circle, Line, Rect, Text } from "react-konva";
import type { deviceAppearance } from "../deviceAppearance";

export function DeviceSymbol({ appearance }: { appearance: ReturnType<typeof deviceAppearance> }) {
  const { kind, running, color, state } = appearance;
  return (
    <>
      {kind === "lamp" ? (
        <>
          {running && (
            <>
              <Circle
                radius={38}
                fillRadialGradientStartPoint={{ x: 0, y: 0 }}
                fillRadialGradientEndPoint={{ x: 0, y: 0 }}
                fillRadialGradientStartRadius={5}
                fillRadialGradientEndRadius={38}
                fillRadialGradientColorStops={[
                  0,
                  "rgba(255,203,54,0.58)",
                  0.5,
                  "rgba(255,211,72,0.24)",
                  1,
                  "rgba(255,211,72,0)",
                ]}
              />
              {Array.from({ length: 8 }, (_, i) => {
                const angle = (i * Math.PI) / 4;
                return (
                  <Line
                    key={i}
                    points={[
                      Math.cos(angle) * 16,
                      Math.sin(angle) * 16,
                      Math.cos(angle) * 22,
                      Math.sin(angle) * 22,
                    ]}
                    stroke="#c1890a"
                    strokeWidth={1.5}
                  />
                );
              })}
            </>
          )}
          <Circle
            radius={10}
            fill={running ? "#ffe16a" : state === "idle" ? "#fff7ee" : "#eff2f0"}
            stroke={color}
            strokeWidth={1.8}
          />
          <Line points={[-7, -7, 7, 7]} stroke={color} strokeWidth={1.5} />
          <Line points={[-7, 7, 7, -7]} stroke={color} strokeWidth={1.5} />
        </>
      ) : (
        <>
          {running && <Rect x={-17} y={-15} width={34} height={30} cornerRadius={7} fill="#16846b20" />}
          <Rect
            x={-11}
            y={-10}
            width={22}
            height={20}
            cornerRadius={3}
            fill={running ? "#d8f0e3" : state === "idle" ? "#fff7ee" : "#eff2f0"}
            stroke={color}
            strokeWidth={1.8}
          />
          <Line points={[-6, -3, -6, 4, 3, 4]} stroke={color} strokeWidth={1.5} />
          <Line points={[-2, -6, -2, 0]} stroke={color} strokeWidth={1.5} />
          <Circle x={6} y={5} radius={2.5} fill={running ? "#087e48" : "#fff"} stroke={color} />
        </>
      )}
      {state === "unpowered" && <Line points={[-13, 13, 13, -13]} stroke="#52685d" strokeWidth={2} />}
      {state === "incomplete" && (
        <>
          <Circle x={10} y={-11} radius={7} fill="white" stroke={color} />
          <Text x={6} y={-16} width={8} text="?" align="center" fontSize={11} fill={color} />
        </>
      )}
    </>
  );
}
