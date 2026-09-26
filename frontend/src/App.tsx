import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import Overview from './pages/Overview';
import Decision from './pages/Decision';
import Experiments from './pages/Experiments';
import Approvals from './pages/Approvals';
import Events from './pages/Events';
import Audit from './pages/Audit';
import { GovernorDataProvider } from './state/GovernorDataProvider';
import './App.css';

function App() {
  return (
    <GovernorDataProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<AppLayout />}>
            <Route index element={<Overview />} />
            <Route path="decision" element={<Decision />} />
            <Route path="experiments" element={<Experiments />} />
            <Route path="approvals" element={<Approvals />} />
            <Route path="events" element={<Events />} />
            <Route path="audit" element={<Audit />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </GovernorDataProvider>
  );
}

export default App;
