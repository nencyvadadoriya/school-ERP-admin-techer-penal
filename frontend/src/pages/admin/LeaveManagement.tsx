import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { leaveAPI } from '../../services/api';
import Badge from '../../components/Badge';
import Spinner from '../../components/Spinner';

const LeaveManagement: React.FC = () => {
  const [studentLeaves, setStudentLeaves] = useState<any[]>([]);
  const [teacherLeaves, setTeacherLeaves] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [tab, setTab] = useState<string>('student');

  const fetch = async () => {
    try {
      const [sR, tR] = await Promise.all([leaveAPI.getStudentLeaves(), leaveAPI.getTeacherLeaves()]);
      setStudentLeaves(sR.data.data || []);
      setTeacherLeaves(tR.data.data || []);
    } catch(e){} finally { setLoading(false); }
  };
  useEffect(()=>{fetch();},[]);

  const updateStudent = async (id, status) => {
    try {
      await leaveAPI.updateStudentLeave(id, { status, approved_by:'Admin' });
      toast.success(`Leave ${status}`);
      fetch();
    } catch(e) { toast.error('Error'); }
  };

  const updateTeacher = async (id, status) => {
    try {
      await leaveAPI.updateTeacherLeave(id, { status, approved_by:'Admin' });
      toast.success(`Leave ${status}`);
      fetch();
    } catch(e) { toast.error('Error'); }
  };

  if (loading) return <Spinner />;

  const leaves = tab==='student' ? studentLeaves : teacherLeaves;
  const updateFn = tab==='student' ? updateStudent : updateTeacher;

  return (
    <div className="space-y-5">
      <div><h1 className="text-2xl font-bold text-gray-900">Leave Management</h1><p className="text-sm text-gray-500">Approve / reject leave applications</p></div>
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        <button onClick={()=>setTab('student')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${tab==='student'?'bg-white shadow-sm text-gray-900':'text-gray-500'}`}>Students ({studentLeaves.filter(l=>l.status==='Pending').length} pending)</button>
        <button onClick={()=>setTab('teacher')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${tab==='teacher'?'bg-white shadow-sm text-gray-900':'text-gray-500'}`}>Teachers ({teacherLeaves.filter(l=>l.status==='Pending').length} pending)</button>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50"><tr className="text-left text-gray-500">
            <th className="px-5 py-3 font-medium">{tab==='student'?'Student':'Teacher'}</th>
            <th className="px-5 py-3 font-medium">Leave Type</th>
            <th className="px-5 py-3 font-medium">From</th>
            <th className="px-5 py-3 font-medium">To</th>
            <th className="px-5 py-3 font-medium">Reason</th>
            <th className="px-5 py-3 font-medium">Status</th>
            <th className="px-5 py-3 font-medium">Actions</th>
          </tr></thead>
          <tbody>{leaves.length===0
            ? <tr><td colSpan="7" className="text-center py-10 text-gray-400">No leave applications</td></tr>
            : leaves.map(l=>(
            <tr key={l._id} className="border-t border-gray-50 hover:bg-gray-50">
              <td className="px-5 py-3 font-medium">{l.student_name || l.teacher_name || (tab==='student'?l.gr_number:l.teacher_code)}</td>
              <td className="px-5 py-3">{l.leave_type}</td>
              <td className="px-5 py-3">{new Date(l.from_date).toLocaleDateString()}</td>
              <td className="px-5 py-3">{new Date(l.to_date).toLocaleDateString()}</td>
              <td className="px-5 py-3 max-w-xs truncate">{l.reason}</td>
              <td className="px-5 py-3"><Badge status={l.status} /></td>
              <td className="px-5 py-3">
                {l.status==='Pending' && (
                  <div className="flex gap-2">
                    <button onClick={()=>updateFn(l._id,'Approved')} className="px-3 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-medium hover:bg-green-200">Approve</button>
                    <button onClick={()=>updateFn(l._id,'Rejected')} className="px-3 py-1 bg-red-100 text-red-700 rounded-lg text-xs font-medium hover:bg-red-200">Reject</button>
                  </div>
                )}
                {l.status!=='Pending' && <span className="text-gray-400 text-xs">—</span>}
              </td>
            </tr>))
          }</tbody>
        </table>
      </div>
    </div>
  );
};

export default LeaveManagement;
