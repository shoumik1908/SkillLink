import React from 'react';
import { useAuth } from '../context/AuthContext';
import { StudentDashboard } from '../components/dashboard/StudentDashboard';
import { AdminDashboard } from '../components/dashboard/AdminDashboard';

export const Dashboard: React.FC = () => {
  const { role } = useAuth();

  return (
    <>
      {role === 'admin' ? <AdminDashboard /> : <StudentDashboard />}
    </>
  );
};

export default Dashboard;
