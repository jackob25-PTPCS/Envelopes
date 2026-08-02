import React from "react";
import { createRoot } from "react-dom/client";
import { initStorage } from "./storage.js";
import App from "./App.jsx";

const root = createRoot(document.getElementById("root"));

initStorage().then(() => {
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
});
