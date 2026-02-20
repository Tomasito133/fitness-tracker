import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard, Workouts, ActiveWorkout, Nutrition, Supplements, Body } from './pages';
import { useTheme } from './hooks/useTheme';
import { useEffect } from 'react';
import { seedExercises } from './db';

function App() {
  useTheme();

  useEffect(() => {
    seedExercises();
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="workouts" element={<Workouts />} />
          <Route path="workouts/:id" element={<ActiveWorkout />} />
          <Route path="nutrition" element={<Nutrition />} />
          <Route path="supplements" element={<Supplements />} />
          <Route path="body" element={<Body />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
