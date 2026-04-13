import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { dashboardAPI, leaveAPI } from '../../services/api';
import Spinner from '../../components/Spinner';
import Badge from '../../components/Badge';
import { useAuth } from '../../context/AuthContext';

const StudentLeaveApprovals: React.FC = () => {
  const { user } = useAuth();
  const [leaves, setLeaves] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [tabClass, setTabClass] = useState<string>('');
  const [myClasses, setMyClasses] = useState<string[]>([]);
  const [allLeaves, setAllLeaves] = useState<any[]>([]);

  const fetchLeaves = async (assignedCodes: string[]) => {
    try {
      const r = await leaveAPI.getStudentLeaves();
      const all = r.data.data || [];
      setAllLeaves(all);
      // Filter leaves to only classes assigned to this teacher
      const filtered = all.filter((l: any) => assignedCodes.includes(l.class_code));
      setLeaves(filtered);
    } catch (e) {
      console.error("Error fetching leaves:", e);
      setLeaves([]);
    } finally { setLoading(false); }
  };

  const loadClasses = async () => {
    try {
      const r = await dashboardAPI.teacher();
      const cls = r.data.data?.myClasses || [];
      const codes = cls.map((c: any) => c.class_code).filter(Boolean);
      setMyClasses(codes);
      await fetchLeaves(codes);
    } catch (e) {
      console.error("Error loading classes:", e);
      const fallback = Array.isArray(user?.assigned_class) ? user.assigned_class : [];
      setMyClasses(fallback);
      await fetchLeaves(fallback);
    }
  };

  useEffect(() => {
    loadClasses();
  }, [user?.assigned_class]);

  const refresh = () => fetchLeaves(myClasses);

  const updateStudent = async (id: string, status: string) => {
    try {
      await leaveAPI.updateStudentLeave(id, { status, approved_by: `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || 'Teacher' });
      toast.success(`Leave ${status}`);
      refresh();
    } catch (e) { toast.error('Error'); }
  };

  if (loading) return <Spinner />;

  const assigned = myClasses;
  const displayed = tabClass ? allLeaves.filter(l => l.class_code === tabClass) : leaves;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Student Leaves (My Classes)</h1>
        <p className="text-sm text-gray-500">Approve / reject leave applications for students in your assigned classes</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="mb-3">
          <label className="text-xs text-gray-500">Filter by Class</label>
          <div className="flex gap-2 mt-2">
            <select className="input-field w-64" value={tabClass} onChange={e => setTabClass(e.target.value)}>
              <option value="">All assigned classes</option>
              {assigned.map((c: string) => <option key={c} value={c}>{c}</option>)}
            </select>
            <button onClick={refresh} className="btn-secondary">Refresh</button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50"><tr className="text-left text-gray-500">
              <th className="px-5 py-3 font-medium">Student</th>
              <th className="px-5 py-3 font-medium">Class</th>
              <th className="px-5 py-3 font-medium">From</th>
              <th className="px-5 py-3 font-medium">To</th>
              <th className="px-5 py-3 font-medium">Reason</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium">Actions</th>
            </tr></thead>
            <tbody>
              {displayed.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8 text-gray-400">No leave applications</td></tr>
              ) : displayed.map(l => (
                <tr key={l._id} className="border-t border-gray-50 hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium">{l.student_name || l.gr_number}</td>
                  <td className="px-5 py-3">{l.class_code}</td>
                  <td className="px-5 py-3">{new Date(l.from_date).toLocaleDateString()}</td>
                  <td className="px-5 py-3">{new Date(l.to_date).toLocaleDateString()}</td>
                  <td className="px-5 py-3 max-w-xs truncate">{l.reason}</td>
                  <td className="px-5 py-3"><Badge status={l.status} /></td>
                  <td className="px-5 py-3">
                    {l.status === 'Pending' ? (
                      <div className="flex gap-2">
                        <button onClick={() => updateStudent(l._id, 'Approved')} className="px-3 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-medium hover:bg-green-200">Approve</button>
                        <button onClick={() => updateStudent(l._id, 'Rejected')} className="px-3 py-1 bg-red-100 text-red-700 rounded-lg text-xs font-medium hover:bg-red-200">Reject</button>
                      </div>
                    ) : <span className="text-gray-400 text-xs">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default StudentLeaveApprovals;
