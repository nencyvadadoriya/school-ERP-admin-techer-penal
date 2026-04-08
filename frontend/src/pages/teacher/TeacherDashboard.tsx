import React, { useState, useEffect } from 'react';
import { FaCalendarCheck, FaUsers, FaClipboardList, FaChalkboardTeacher } from 'react-icons/fa';
import { dashboardAPI } from '../../services/api';
import StatCard from '../../components/StatCard';
import Badge from '../../components/Badge';
import Spinner from '../../components/Spinner';
import { useAuth } from '../../context/AuthContext';

const TeacherDashboard: React.FC = () => {
  const { user } = useAuth();
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    dashboardAPI.teacher()
      .then(r => setData(r.data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-base md:text-lg font-bold text-gray-900">Welcome, {user?.first_name || 'Teacher'}</h1>
        <p className="text-gray-500 text-xs mt-0.5">Here's your overview for today</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <StatCard title="My Classes" value={data?.myClasses?.length || 0} icon={FaChalkboardTeacher} color="blue" />
        <StatCard title="Total Students" value={data?.totalStudentsInClasses || 0} icon={FaUsers} color="green" />
        <StatCard title="Attendance Pending" value={data?.attendancePending || 0} icon={FaCalendarCheck} color="orange" subtitle="classes today" />
        <StatCard title="Homework Given" value={data?.homeworkGiven || 0} icon={FaClipboardList} color="purple" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-2">
          <h2 className="text-xs font-semibold text-gray-900 mb-2">My Classes</h2>
          {!data?.myClasses?.length ? <p className="text-gray-400 text-xs">No classes assigned</p>
          : <div className="space-y-2">
            {data.myClasses.map(c=>(
              <div key={c._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{c.class_code}</p>
                  <p className="text-xs text-gray-500">Std {c.standard} – {c.division} | {c.medium}</p>
                </div>
                <span className="text-xs text-primary-600 bg-primary-50 px-2 py-1 rounded-full">{c.shift}</span>
              </div>
            ))}
          </div>}
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-2">
          <h2 className="text-xs font-semibold text-gray-900 mb-2">Upcoming Exams</h2>
          {!data?.upcomingExams?.length ? <p className="text-gray-400 text-xs">No upcoming exams</p>
          : <div className="space-y-2">
            {data.upcomingExams.map(ex=>(
              <div key={ex._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{ex.exam_name}</p>
                  <p className="text-xs text-gray-500">{ex.class_code} | {ex.subject_code}</p>
                </div>
                <p className="text-xs text-gray-500">{new Date(ex.exam_date).toLocaleDateString()}</p>
              </div>
            ))}
          </div>}
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-2 lg:col-span-2">
          <h2 className="text-xs font-semibold text-gray-900 mb-2">My Leave Applications</h2>
          {!data?.myLeaves?.length ? <p className="text-gray-400 text-xs">No leave applications</p>
          : <table className="w-full text-xs">
            <thead><tr className="text-left text-gray-500 border-b border-gray-100">
              <th className="pb-2 font-medium">Type</th><th className="pb-2 font-medium">From</th><th className="pb-2 font-medium">To</th><th className="pb-2 font-medium">Status</th>
            </tr></thead>
            <tbody>{data.myLeaves.map(l=>(
              <tr key={l._id} className="border-t border-gray-50">
                <td className="py-2">{l.leave_type}</td>
                <td className="py-2">{new Date(l.from_date).toLocaleDateString()}</td>
                <td className="py-2">{new Date(l.to_date).toLocaleDateString()}</td>
                <td className="py-2"><Badge status={l.status} /></td>
              </tr>
            ))}</tbody>
          </table>}
        </div>
      </div>
    </div>
  );
};

export default TeacherDashboard;
