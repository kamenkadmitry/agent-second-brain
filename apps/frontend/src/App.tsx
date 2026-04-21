import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import GraphView from './pages/GraphView';
import Eisenhower from './pages/Eisenhower';
import Memories from './pages/Memories';
import Entries from './pages/Entries';
import Skills from './pages/Skills';
import Settings from './pages/Settings';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login mode="login" />} />
      <Route path="/register" element={<Login mode="register" />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="graph" element={<GraphView />} />
        <Route path="eisenhower" element={<Eisenhower />} />
        <Route path="memories" element={<Memories />} />
        <Route path="entries" element={<Entries />} />
        <Route path="skills" element={<Skills />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}
