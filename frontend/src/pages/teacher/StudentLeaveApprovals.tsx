import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { dashboardAPI, leaveAPI, teacherAPI, classAPI } from '../../services/api';
import Spinner from '../../components/Spinner';
import Badge from '../../components/Badge';
import { useAuth } from '../../context/AuthContext';

// Normalize class code: "STD-1-A-English-Primary-Morning" -> "1aenglish"
const normalizeCode = (s: string) =>
  String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

const getCodeVariants = (code: string): string[] => {
  const s = String(code || '').trim();
  const variants = new Set<string>();
  variants.add(s);
  const noSTD = s.replace(/^STD-/i, '');
  variants.add(noSTD);
  const parts = noSTD.split('-');
  if (parts.length > 3) variants.add(parts.slice(0, 3).join('-'));
  return Array.from(variants).filter(Boolean);
};

const StudentLeaveApprovals: React.FC = () => {
  const { user } = useAuth();
  const [allLeaves, setAllLeaves] = useState<any[]>([]);
  const [displayedLeaves, setDisplayedLeaves] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [myClasses, setMyClasses] = useState<string[]>([]); // resolved DB class_codes
  const [tabClass, setTabClass] = useState<string>('');

  // Resolve raw code to actual DB class_code
  const resolveCode = (rawCode: string, allClasses: any[]): string => {
    const variants = getCodeVariants(rawCode);
    for (const v of variants) {
      const found = allClasses.find((c: any) => c.class_code === v);
      if (found) return found.class_code;
    }
    const targetNorm = normalizeCode(rawCode);
    const found = allClasses.find((c: any) => normalizeCode(c.class_code) === targetNorm);
    return found?.class_code || variants.sort((a, b) => a.length - b.length)[0] || rawCode;
  };

  // Get assigned class codes using multiple fallback strategies
  const fetchAssignedClassCodes = async (): Promise<string[]> => {
    let rawCodes: string[] = [];

    // Strategy 1: Dashboard API
    try {
      const r = await dashboardAPI.teacher();
      const cls = r.data.data?.myClasses || [];
      const codes = cls.map((c: any) => c.class_code).filter(Boolean);
      if (codes.length > 0) rawCodes = codes;
    } catch (e) {
      console.warn('Dashboard API failed...');
    }

    // Strategy 2: Fresh teacher profile from DB
    if (rawCodes.length === 0) {
      const teacherId = user?.id || user?._id;
      if (teacherId) {
        try {
          const tR = await teacherAPI.getById(teacherId);
          const assigned: string[] = Array.isArray(tR.data.data?.assigned_class)
            ? tR.data.data.assigned_class.filter(Boolean)
            : [];
          if (assigned.length > 0) rawCodes = assigned;
        } catch (e) {
          console.warn('Teacher profile fetch failed...');
        }
      }
    }

    // Strategy 3: localStorage
    if (rawCodes.length === 0) {
      rawCodes = Array.isArray(user?.assigned_class) ? user.assigned_class.filter(Boolean) : [];
    }

    if (rawCodes.length === 0) return [];

    // Resolve codes against actual DB class documents
    try {
      const cR = await classAPI.getAll();
      const allClasses: any[] = cR.data.data || [];
      const resolved = rawCodes.map((code) => resolveCode(code, allClasses));
      // Deduplicate
      return [...new Set(resolved)];
    } catch (e) {
      return rawCodes;
    }
  };

  const fetchLeaves = async (resolvedCodes: string[]) => {
    try {
      const r = await leaveAPI.getStudentLeaves();
      const all: any[] = r.data.data || [];
      setAllLeaves(all);

      if (resolvedCodes.length === 0) {
        setDisplayedLeaves([]);
        return;
      }

      // Match using both exact and normalized comparison
      const resolvedNorm = resolvedCodes.map(normalizeCode);
      const filtered = all.filter((l: any) =>
        resolvedCodes.includes(l.class_code) ||
        resolvedNorm.includes(normalizeCode(l.class_code))
      );
      setDisplayedLeaves(filtered);
    } catch (e) {
      console.error('Error fetching leaves:', e);
      setDisplayedLeaves([]);
    } finally {
      setLoading(false);
    }
  };

  const loadAll = async () => {
    setLoading(true);
    const codes = await fetchAssignedClassCodes();
    setMyClasses(codes);
    await fetchLeaves(codes);
  };

  useEffect(() => {
    loadAll();
  }, []);

  // Re-filter when tab changes
  useEffect(() => {
    if (tabClass) {
      setDisplayedLeaves(allLeaves.filter((l: any) =>
        l.class_code === tabClass || normalizeCode(l.class_code) === normalizeCode(tabClass)
      ));
    } else {
      const resolvedNorm = myClasses.map(normalizeCode);
      const filtered = allLeaves.filter((l: any) =>
        myClasses.includes(l.class_code) ||
        resolvedNorm.includes(normalizeCode(l.class_code))
      );
      setDisplayedLeaves(filtered);
    }
  }, [tabClass, allLeaves, myClasses]);

  const handleAction = async (id: string, status: 'Approved' | 'Rejected') => {
    setActionLoading(id + status);
    try {
      await leaveAPI.updateStudentLeave(id, {
        status,
        approved_by: `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || 'Teacher',
      });
      toast.success(`Leave ${status} successfully`);
      // Instant UI update without full re-fetch
      setAllLeaves(prev => prev.map(l => l._id === id ? { ...l, status } : l));
    } catch (e: any) {
      const msg = e?.response?.data?.message || 'Error updating leave';
      toast.error(msg);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) return <Spinner />;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Student Leaves (My Classes)</h1>
        <p className="text-sm text-gray-500">
          Approve / reject leave applications for students in your assigned classes
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="mb-3 flex items-end gap-3 flex-wrap">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Filter by Class</label>
            <select
              className="input-field w-64"
              value={tabClass}
              onChange={e => setTabClass(e.target.value)}
            >
              <option value="">All assigned classes</option>
              {myClasses.map((c: string) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <button onClick={loadAll} className="btn-secondary mb-0.5">Refresh</button>
          {myClasses.length === 0 && (
            <p className="text-sm text-red-500">No classes assigned to you. Contact admin.</p>
          )}
        </div>

        <div className="text-xs text-gray-400 mb-2">
          {displayedLeaves.length} leave application{displayedLeaves.length !== 1 ? 's' : ''} found
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left text-gray-500">
                <th className="px-5 py-3 font-medium">Student</th>
                <th className="px-5 py-3 font-medium">Class</th>
                <th className="px-5 py-3 font-medium">From</th>
                <th className="px-5 py-3 font-medium">To</th>
                <th className="px-5 py-3 font-medium">Reason</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayedLeaves.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gray-400">
                    {myClasses.length === 0
                      ? 'No classes assigned. Please ask admin to assign you a class.'
                      : 'No leave applications found for your classes.'}
                  </td>
                </tr>
              ) : (
                displayedLeaves.map(l => (
                  <tr key={l._id} className="border-t border-gray-50 hover:bg-gray-50">
                    <td className="px-5 py-3 font-medium">{l.student_name || l.gr_number}</td>
                    <td className="px-5 py-3">{l.class_code}</td>
                    <td className="px-5 py-3">{new Date(l.from_date).toLocaleDateString()}</td>
                    <td className="px-5 py-3">{new Date(l.to_date).toLocaleDateString()}</td>
                    <td className="px-5 py-3 max-w-xs truncate" title={l.reason}>{l.reason}</td>
                    <td className="px-5 py-3"><Badge status={l.status} /></td>
                    <td className="px-5 py-3">
                      {l.status === 'Pending' ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAction(l._id, 'Approved')}
                            disabled={!!actionLoading}
                            className="px-3 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-medium hover:bg-green-200 disabled:opacity-50"
                          >
                            {actionLoading === l._id + 'Approved' ? '...' : 'Approve'}
                          </button>
                          <button
                            onClick={() => handleAction(l._id, 'Rejected')}
                            disabled={!!actionLoading}
                            className="px-3 py-1 bg-red-100 text-red-700 rounded-lg text-xs font-medium hover:bg-red-200 disabled:opacity-50"
                          >
                            {actionLoading === l._id + 'Rejected' ? '...' : 'Reject'}
                          </button>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs">
                          {l.approved_by ? `By: ${l.approved_by}` : '—'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default StudentLeaveApprovals;