import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app/App";
import "./app/styles.css";
import "./app/panels.css";
import "./app/simulation.css";
import "./app/housebook.css";
import "./app/tablet.css";
import "./app/ribbon.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
