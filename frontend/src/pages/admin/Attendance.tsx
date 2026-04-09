import React, { useState, useEffect } from 'react';
import { FaSearch, FaCalendarCheck } from 'react-icons/fa';
import { attendanceAPI, classAPI } from '../../services/api';
import Badge from '../../components/Badge';
import Spinner from '../../components/Spinner';

const Attendance: React.FC = () => {
  const [records, setRecords] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
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
      
      // Construct class_code pattern or use individual filters if backend supports it
      // For now, if we have standard, medium and division, we can construct the code
      // STD-1-A-English-NA-NA format based on Teachers.tsx logic
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

  return (
    <div className="space-y-5">
      <div><h1 className="text-2xl font-bold text-gray-900">Attendance Records</h1><p className="text-sm text-gray-500">View all attendance data</p></div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3 mb-4">
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

          <input type="date" className="input-field" value={filters.from} onChange={e=>setFilters({...filters,from:e.target.value})} />
          <input type="date" className="input-field" value={filters.to} onChange={e=>setFilters({...filters,to:e.target.value})} />
          <button onClick={fetch} className="btn-primary flex items-center justify-center gap-2"><FaSearch />Search</button>
        </div>
        {loading ? <Spinner /> : (
          <div className="space-y-4">
            {records.length===0 ? <div className="text-center py-10 text-gray-400">No records found</div>
            : records.map(att=>(
              <div key={att._id} className="border border-gray-100 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">Class: {att.class_code}</h3>
                    <p className="text-sm text-gray-500">{new Date(att.date).toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-700">Total: {att.records?.length}</p>
                    <p className="text-sm text-green-600">Present: {att.records?.filter(r=>r.status==='Present'||r.status==='Late').length}</p>
                    <p className="text-sm text-red-600">Absent: {att.records?.filter(r=>r.status==='Absent').length}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {att.records?.map((r,i)=>(
                    <span key={i} className="text-xs flex items-center gap-1">
                      <span className="font-medium">{r.gr_number}</span>
                      <Badge status={r.status} />
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Attendance;
