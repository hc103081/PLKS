// apps/web/src/App.tsx
import { Route, Routes } from "react-router-dom";
import { CoursePage } from "./pages/CoursePage";
import { Dashboard } from "./pages/Dashboard.js";
import { QuizPlayer } from "./pages/QuizPlayer.js";
import { SidekickChat } from "./pages/SidekickChat.js";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/course/:courseId" element={<CoursePage />} />
      <Route path="/quiz/:courseId" element={<QuizPlayer />} />
      <Route path="/sidekick/:courseId" element={<SidekickChat />} />
    </Routes>
  );
}

export default App;
