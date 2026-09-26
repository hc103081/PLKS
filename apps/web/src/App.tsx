// apps/web/src/App.tsx
import { Route, Routes } from "react-router-dom";

function App() {
	return (
		<Routes>
			<Route path="/" element={<div>PLKS Dashboard (TODO)</div>} />
			<Route
				path="/course/:courseId"
				element={<div>Course Console (TODO)</div>}
			/>
			<Route path="/quiz/:courseId" element={<div>Quiz Player (TODO)</div>} />
			<Route
				path="/sidekick/:quizId"
				element={<div>Sidekick Chat (TODO)</div>}
			/>
		</Routes>
	);
}

export default App;
