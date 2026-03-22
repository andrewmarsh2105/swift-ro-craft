import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Apply theme before first render to prevent flash
const savedTheme = localStorage.getItem('ro-tracker-theme');
if (savedTheme === 'dark') {
  document.documentElement.classList.add('dark');
} else {
  document.documentElement.classList.remove('dark');
}

// Apply fixed blue accent before first render to prevent flash
const isDark = savedTheme === 'dark';
const blueHsl = isDark ? '214 90% 65%' : '214 95% 53%';
document.documentElement.style.setProperty('--primary', blueHsl);
document.documentElement.style.setProperty('--ring', blueHsl);

createRoot(document.getElementById("root")!).render(<App />);
