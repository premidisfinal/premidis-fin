import React from "react";
import ReactDOM from "react-dom/client";
import "@/index.css";
import App from "@/App";
import "dotenv/config";
console.log("https://oepveaztlesdzwcjsnkx.supabase.co",process,env.SUPABASE_URL ? "OK" : "MISSING")


const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
