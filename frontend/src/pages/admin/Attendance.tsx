import React, { useState, useEffect } from 'react';
import { FaSearch, FaCalendarCheck, FaCheck, FaTimes } from 'react-icons/fa';
import { attendanceAPI, classAPI } from '../../services/api';
import Badge from '../../components/Badge';
import Spinner from '../../components/Spinner';

const Attendance: React.FC = () => {
  const [records, setRecords] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedAttendance, setSelectedAttendance] = useState<any>(null);
  const [filters, setFilters] = useState<{ 
    standard: string; 
    medium: string; 
    division: string;
    from: string; 
    to: string 
  }>({ standard: '', medium: '', division: '', from: '', to: '' });

  const fetchClasses = async () => {
    try {
      const res = await classAPI.getAll();
      setClasses(res.data.data || []);
    } catch (err) {
      console.error('Error fetching classes:', err);
    }
  };

  const fetch = async () => {
    setLoading(true);
    try {
      const params: any = {};
      
      if (filters.standard && filters.division && filters.medium) {
        const cls = classes.find(c => 
          String(c.standard) === filters.standard && 
          c.division === filters.division && 
          c.medium === filters.medium
        );
        if (cls) {
          const standard = cls?.standard ?? '';
          const division = cls?.division ?? '';
          const medium = cls?.medium ?? '';
          const stream = cls?.stream ?? '';
          const shift = cls?.shift ?? '';
          params.class_code = `STD-${standard}-${division}-${medium}-${stream || 'NA'}-${shift || 'NA'}`;
        }
      }

      if (filters.from) params.from = filters.from;
      if (filters.to) params.to = filters.to;
      const r = await attendanceAPI.getAll(params);
      setRecords(r.data.data || []);
    } catch(e){} finally { setLoading(false); }
  };

  useEffect(() => {
    fetchClasses();
    fetch();
  }, []);

  const standards = Array.from(new Set(classes.map(c => String(c.standard)))).sort((a, b) => Number(a) - Number(b));
  const mediums = Array.from(new Set(classes.map(c => c.medium))).filter(Boolean);
  const divisions = Array.from(new Set(classes.map(c => c.division))).filter(Boolean).sort();

  // Parse class_code to extract details
  const parseClassCode = (classCode: string) => {
    const parts = classCode.split('-');
    return {
      standard: parts[1],
      division: parts[2],
      medium: parts[3],
      stream: parts[4],
      shift: parts[5]
    };
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Attendance Records</h1>
        <p className="text-sm text-gray-500">View and manage student attendance</p>
      </div>
      
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3 mb-6">
          <select 
            className="input-field" 
            value={filters.standard} 
            onChange={e => setFilters({ ...filters, standard: e.target.value })}
          >
            <option value="">Standard</option>
            {standards.map(s => <option key={s} value={s}>Class {s}</option>)}
          </select>

          <select 
            className="input-field" 
            value={filters.medium} 
            onChange={e => setFilters({ ...filters, medium: e.target.value })}
          >
            <option value="">Medium</option>
            {mediums.map(m => <option key={m} value={m}>{m}</option>)}
          </select>

          <select 
            className="input-field" 
            value={filters.division} 
            onChange={e => setFilters({ ...filters, division: e.target.value })}
          >
            <option value="">Division</option>
            {divisions.map(d => <option key={d} value={d}>{d}</option>)}
          </select>

          <input 
            type="date" 
            className="input-field" 
            value={filters.from} 
            onChange={e=>setFilters({...filters,from:e.target.value})} 
            placeholder="From Date"
          />
          <input 
            type="date" 
            className="input-field" 
            value={filters.to} 
            onChange={e=>setFilters({...filters,to:e.target.value})} 
            placeholder="To Date"
          />
          <button 
            onClick={fetch} 
            className="btn-primary flex items-center justify-center gap-2"
          >
            <FaSearch /> Search
          </button>
        </div>

        {loading ? (
          <Spinner />
        ) : (
          <div className="space-y-6">
            {records.length === 0 ? (
              <div className="text-center py-10 text-gray-400">No attendance records found</div>
            ) : (
              records.map((att, index) => {
                const classDetails = parseClassCode(att.class_code);
                return (
                  <div key={att._id || index} className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                    {/* Header Section */}
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-200">
                      <div className="flex flex-wrap justify-between items-center">
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">
                            Class {classDetails.standard} - {classDetails.division} ({classDetails.medium} Medium)
                          </h3>
                          <p className="text-sm text-gray-600 mt-1">
                            {classDetails.stream !== 'NA' && `Stream: ${classDetails.stream} | `}
                            {classDetails.shift !== 'NA' && `Shift: ${classDetails.shift} | `}
                            Date: {new Date(att.date).toLocaleDateString('en-IN', {
                              weekday: 'long',
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric'
                            })}
                          </p>
                        </div>
                        <div className="flex gap-4 mt-2 sm:mt-0">
                          <div className="text-center">
                            <p className="text-2xl font-bold text-gray-700">{att.records?.length || 0}</p>
                            <p className="text-xs text-gray-500">Total Students</p>
                          </div>
                          <div className="text-center">
                            <p className="text-2xl font-bold text-green-600">
                              {att.records?.filter(r => r.status === 'Present' || r.status === 'Late').length || 0}
                            </p>
                            <p className="text-xs text-green-600">Present</p>
                          </div>
                          <div className="text-center">
                            <p className="text-2xl font-bold text-red-600">
                              {att.records?.filter(r => r.status === 'Absent').length || 0}
                            </p>
                            <p className="text-xs text-red-600">Absent</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Table View */}
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">GR No.</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Roll No.</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student Name</th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100">
                          {att.records?.map((record: any, idx: number) => (
                            <tr key={record.student_id || idx} className="hover:bg-gray-50 transition-colors">
                              <td className="px-4 py-3 text-sm text-gray-900 font-mono">
                                {record.gr_number || record.gr_no || '-'}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900">
                                {record.roll_no || record.roll_number || '-'}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                                {record.student_name || record.name || 'N/A'}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                                  record.status === 'Present' 
                                    ? 'bg-green-100 text-green-800' 
                                    : record.status === 'Late'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-red-100 text-red-800'
                                }`}>
                                  {record.status === 'Present' && <FaCheck className="mr-1 text-xs" />}
                                  {record.status === 'Absent' && <FaTimes className="mr-1 text-xs" />}
                                  {record.status || 'Absent'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Attendance;