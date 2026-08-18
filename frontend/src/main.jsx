// main.jsx
// The entry point of the app. This is what actually mounts React
// onto the <div id="root"> in index.html.

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
