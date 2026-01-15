import React from "react";
import ReactDOM from "react-dom/client";
import { ThemeProvider } from "@/contexts/ThemeContext";
import Popup from "@/pages/Popup";
import "./index.css";

// 本地化字体 - Noto Serif SC（思源宋体）
import '@fontsource/noto-serif-sc/400.css';
import '@fontsource/noto-serif-sc/500.css';
import '@fontsource/noto-serif-sc/700.css';

ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
        <ThemeProvider>
            <Popup />
        </ThemeProvider>
    </React.StrictMode>
); 