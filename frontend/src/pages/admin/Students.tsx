import React, { useState, useEffect } from 'react';
import { studentAPI, classAPI } from '../../services/api';
import { toast } from 'react-toastify';
import { FaPlus, FaEdit, FaTrash, FaSearch, FaHistory, FaCheck, FaTimes, FaTable, FaThLarge, FaUsers, FaMale, FaFemale, FaUserGraduate, FaFilter } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

const Students: React.FC = () => {
  const navigate = useNavigate();
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>(''); // Class filter
  const [selectedStdFilter, setSelectedStdFilter] = useState<string>(''); // Standard filter
  const [showModal, setShowModal] = useState<boolean>(false);
  const [showBulkModal, setShowBulkModal] = useState<boolean>(false);
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [bulkRows, setBulkRows] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table');
  const [bulkApplyAll, setBulkApplyAll] = useState({
    std: '',
    shift: '',
    gender: '',
    stream: '',
    medium: '',
    fees: '',
    class_name: '',
    pin: '',
    password: '',
  });
  const [bulkSubmitting, setBulkSubmitting] = useState<boolean>(false);
  const [bulkResults, setBulkResults] = useState<any | null>(null);
  const [bulkInputText, setBulkInputText] = useState<string>('');

  const parseBulkInput = (text: string) => {
    const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
    const newStudents = lines.map(line => {
      // Handle the specific format: Roll No: 1 | First Name: Aarav | Last Name: Patel | Middle Name: Kumar | ...
      if (line.includes('|') && line.includes(':')) {
        const student: any = {
          roll_no: '', first_name: '', last_name: '', middle_name: '', phone1: '', phone2: '', address: '',
          std: bulkApplyAll.std, class_name: bulkApplyAll.class_name, shift: bulkApplyAll.shift, gender: bulkApplyAll.gender,
          stream: bulkApplyAll.stream, medium: bulkApplyAll.medium, fees: bulkApplyAll.fees, pin: bulkApplyAll.pin, password: bulkApplyAll.password,
        };

        const parts = line.split('|');
        parts.forEach(part => {
          const [key, ...valParts] = part.split(':');
          const value = valParts.join(':').trim();
          const k = key.trim().toLowerCase().replace(/\s/g, '');

          if (k === 'rollno') student.roll_no = value;
          else if (k === 'firstname') student.first_name = value;
          else if (k === 'lastname') student.last_name = value;
          else if (k === 'middlename') student.middle_name = value;
          else if (k === 'phone1') student.phone1 = value;
          else if (k === 'phone2') student.phone2 = value;
          else if (k === 'address') student.address = value;
        });

        // Remove numbering if present in first_name (e.g. "1. Aarav" -> "Aarav")
        student.first_name = student.first_name.replace(/^\d+[\.\s]*/, '').trim();

        return student;
      }

      // Fallback to Tab/CSV
      const columns = line.split(line.includes('\t') ? '\t' : ',');
      console.log('Parsed columns for line:', line, columns);
      
      return {
        roll_no: columns[0]?.trim() || '',
        first_name: (columns[1] || '').replace(/^\d+[\.\s]*/, '').trim(),
        last_name: columns[2]?.trim() || '',
        phone1: columns[3]?.trim() || '',
        phone2: columns[4]?.trim() || '',
        address: columns[5]?.trim() || '',
        std: columns[6]?.trim() || bulkApplyAll.std,
        class_name: columns[7]?.trim() || bulkApplyAll.class_name,
        pin: columns[8]?.trim() || bulkApplyAll.pin,
        password: columns[9]?.trim() || bulkApplyAll.password,
        shift: bulkApplyAll.shift,
        gender: bulkApplyAll.gender,
        stream: bulkApplyAll.stream,
        fees: bulkApplyAll.fees,
        middle_name: ''
      };
    });

    return newStudents;
  };

  const handleAddToList = () => {
    if (!bulkInputText.trim()) {
      toast.error('Please paste some data first');
      return;
    }
    const parsed = parseBulkInput(bulkInputText);
    setBulkRows(prev => {
      // If only one empty row exists, replace it
      if (prev.length === 1 && !prev[0].first_name && !prev[0].last_name) return parsed;
      return [...prev, ...parsed];
    });
    setBulkInputText('');
    toast.success(`Added ${parsed.length} students to the list`);
  };

  const handleBulkRowChange = (index: number, field: string, value: any) => {
    const updated = [...bulkRows];
    updated[index] = { ...updated[index], [field]: value };
    setBulkRows(updated);
  };

  const applyToAll = (field: string) => {
    const val = bulkApplyAll[field];
    if (!val) {
      toast.warn(`Please select a value for ${field} first`);
      return;
    }
    setBulkRows(prev => prev.map(row => ({ ...row, [field]: val })));
    toast.success(`Applied ${val} to all rows`);
  };

  const addBulkRow = () => {
    setBulkRows([...bulkRows, {
      roll_no: '',
      first_name: '',
      middle_name: '',
      last_name: '',
      phone1: '',
      phone2: '',
      address: '',
      pin: '',
      password: '',
      std: bulkApplyAll.std,
      class_name: bulkApplyAll.class_name,
      shift: bulkApplyAll.shift,
      gender: bulkApplyAll.gender,
      stream: bulkApplyAll.stream,
      medium: bulkApplyAll.medium,
      fees: bulkApplyAll.fees,
    }]);
  };

  const removeBulkRow = (index: number) => {
    setBulkRows(bulkRows.filter((_, i) => i !== index));
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasteData = e.clipboardData.getData('text');
    if (!pasteData) return;

    const lines = pasteData.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length === 0) return;

    const newRows = lines.map(line => {
      const columns = line.split('\t');
      // If the row looks like Excel data with multiple columns, assume first column is Roll No
      if (columns.length >= 3) {
        return {
          roll_no: columns[0] || '',
          first_name: columns[1] || '',
          last_name: columns[2] || '',
          phone1: columns[3] || '',
          phone2: columns[4] || '',
          address: columns[5] || '',
          std: columns[6] || bulkApplyAll.std,
          class_name: columns[7] || bulkApplyAll.class_name,
          pin: columns[8] || bulkApplyAll.pin,
          password: columns[9] || bulkApplyAll.password,
          shift: bulkApplyAll.shift,
          gender: bulkApplyAll.gender,
          stream: bulkApplyAll.stream,
          medium: bulkApplyAll.medium,
          fees: bulkApplyAll.fees,
          middle_name: ''
        };
      }
      // If only 1-2 columns, maybe it's just names, don't force roll_no
      return {
        roll_no: '',
        first_name: columns[0] || '',
        last_name: columns[1] || '',
        phone1: '',
        phone2: '',
        address: '',
        std: bulkApplyAll.std,
        class_name: bulkApplyAll.class_name,
        pin: bulkApplyAll.pin,
        password: bulkApplyAll.password,
        shift: bulkApplyAll.shift,
        gender: bulkApplyAll.gender,
        stream: bulkApplyAll.stream,
        fees: bulkApplyAll.fees,
        middle_name: ''
      };
    });

    setBulkRows(prev => {
      // If the first row is empty, replace it
      if (prev.length === 1 && !prev[0].first_name && !prev[0].last_name) {
        return newRows;
      }
      return [...prev, ...newRows];
    });

    toast.success(`Pasted ${newRows.length} rows from clipboard`);
  };
  
  const [formData, setFormData] = useState({
    std: '',
    roll_no: '',
    first_name: '',
    middle_name: '',
    last_name: '',
    gender: '',
    phone1: '',
    phone2: '',
    address: '',
    pin: '',
    class_code: '',
    class_name: '',
    password: '',
    fees: '',
    shift: '',
    stream: '',
    medium: '',
  });

  // Stream options based on standard
  const getStreamOptions = (std) => {
    const standardNum = Number(std);
    if (standardNum >= 11) {
      return [
        { value: 'Science-Maths', label: 'Science-Maths' },
        { value: 'Science-Bio', label: 'Science-Bio' },
        { value: 'Commerce', label: 'Commerce' },
        { value: 'Higher Secondary', label: 'Higher Secondary' }
      ];
    } else if (standardNum >= 9) {
      return [
        { value: 'Foundation', label: 'Foundation' },
        { value: 'Secondary', label: 'Secondary' }
      ];
    } else if (standardNum >= 6) {
      return [
        { value: 'Upper Primary', label: 'Upper Primary' }
      ];
    } else if (standardNum >= 1) {
      return [
        { value: 'Primary', label: 'Primary' }
      ];
    }
    return [];
  };

  // Subject code options based on standard
  const getSubjectCodeOptions = (std, stream) => {
    const standardNum = Number(std);

    if (standardNum <= 9) {
      // For standards 1-9: subject_code is optional
      return [
        { value: '', label: 'None (Optional)' },
        { value: 'MATHS', label: 'Mathematics' },
        { value: 'SCIENCE', label: 'Science' },
        { value: 'ENGLISH', label: 'English' },
        { value: 'GUJARATI', label: 'Gujarati' },
        { value: 'HINDI', label: 'Hindi' },
        { value: 'SST', label: 'Social Studies' },
        { value: 'COMPUTER', label: 'Computer Science' }
      ];
    } else {
      // For standards 10-12: subject_code is compulsory
      if (stream === 'Science-Maths') {
        return [
          { value: 'MATHS', label: 'Mathematics (Compulsory)' },
          { value: 'PHYSICS', label: 'Physics (Compulsory)' },
          { value: 'CHEMISTRY', label: 'Chemistry (Compulsory)' }
        ];
      } else if (stream === 'Science-Bio') {
        return [
          { value: 'BIOLOGY', label: 'Biology (Compulsory)' },
          { value: 'PHYSICS', label: 'Physics (Compulsory)' },
          { value: 'CHEMISTRY', label: 'Chemistry (Compulsory)' }
        ];
      } else if (stream === 'Commerce') {
        return [
          { value: 'ACCOUNTS', label: 'Accounts (Compulsory)' },
          { value: 'BUSINESS', label: 'Business Studies (Compulsory)' },
          { value: 'ECONOMICS', label: 'Economics (Compulsory)' }
        ];
      } else if (stream === 'Higher Secondary') {
        return [
          { value: 'ENGLISH', label: 'English (Compulsory)' },
          { value: 'GUJARATI', label: 'Gujarati (Compulsory)' }
        ];
      }
      return [
        { value: 'GENERAL', label: 'General Studies (Compulsory)' }
      ];
    }
  };

  useEffect(() => {
    fetchStudents();
    fetchClasses();
  }, []);

  const fetchStudents = async () => {
    try {
      const response = await studentAPI.getAll();
      setStudents(response.data.data);
      setLoading(false);
    } catch (error) {
      toast.error('Error fetching students');
      setLoading(false);
    }
  };

  const fetchClasses = async () => {
    try {
      const response = await classAPI.getAll();
      setClasses(response.data?.data || []);
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  // Get unique classes from students for filter dropdown
  const getUniqueClasses = () => {
    const classSet = new Set();
    students.forEach(student => {
      if (student.class_name) {
        classSet.add(student.class_name);
      }
    });
    return Array.from(classSet).sort();
  };

  // Get unique standards from students for filter dropdown
  const getUniqueStandards = () => {
    const stdSet = new Set();
    students.forEach(student => {
      if (student.std) {
        stdSet.add(student.std);
      }
    });
    return Array.from(stdSet).sort((a, b) => Number(a) - Number(b));
  };

  // Filter students based on search term, selected class, and selected standard
  const filteredStudents = students
    .filter((student) => {
      // Apply class filter
      if (selectedClassFilter && student.class_name !== selectedClassFilter) {
        return false;
      }
      // Apply standard filter
      if (selectedStdFilter && student.std !== selectedStdFilter) {
        return false;
      }
      // Apply search filter
      if (searchTerm && !student.first_name.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !student.last_name.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !student.gr_number?.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      return true;
    })
    .sort((a, b) => (Number(a.roll_no) || 0) - (Number(b.roll_no) || 0));

  const handleFormChange = (e: any) => {
    const { name, value } = e.target;
    setFormData((s) => ({ ...s, [name]: value }));

    // Reset stream when standard changes
    if (name === 'std') {
      setFormData((s) => ({
        ...s,
        std: value,
        stream: '',
      }));
    }

    // Update stream when stream changes
    if (name === 'stream') {
      setFormData((s) => ({ ...s, stream: value }));
    }
  };

  const openAddModal = () => {
    setSelectedStudent(null);
    setFormData({
      std: '', roll_no: '', first_name: '', middle_name: '', last_name: '', 
      gender: '', phone1: '', phone2: '', address: '', pin: '', 
      class_code: '', class_name: '', password: '', fees: '', 
      shift: '', stream: '', medium: '',
    });
    setShowModal(true);
  };

  const openBulkModal = () => {
    setBulkResults(null);
    setBulkSubmitting(false);
    setBulkRows([]);
    setBulkInputText('');
    setBulkApplyAll({ std: '', class_name: '', shift: '', gender: '', stream: '', medium: '', fees: '', pin: '', password: '' });
    setShowBulkModal(true);
  };

  const handleBulkSubmit = async () => {
    try {
      // Validate rows
      const missingFields: string[] = [];
      bulkRows.forEach((row, index) => {
        if (!row.first_name || !row.last_name || !row.std || !row.class_name || !row.medium) {
          missingFields.push(`Row ${index + 1}: ${[!row.first_name && 'First Name', !row.last_name && 'Last Name', !row.std && 'Std', !row.class_name && 'Class', !row.medium && 'Medium'].filter(Boolean).join(', ')}`);
        }
      });

      if (missingFields.length > 0) {
        toast.error(
          <div>
            <p className="font-bold">Missing required fields:</p>
            <ul className="list-disc ml-4 text-xs">
              {missingFields.map((msg, i) => <li key={i}>{msg}</li>)}
            </ul>
          </div>
        );
        return;
      }

      const validRows = bulkRows.filter(r => r.first_name && r.last_name && r.std && r.class_name && r.medium);
      if (!validRows.length) {
        toast.error('Please fill at least one row with first name, last name, standard, and medium');
        return;
      }

      setBulkSubmitting(true);
      setBulkResults(null);

      // The backend uses matchingClass to resolve class_code if not provided or if it's generic.
      // However, we should ensure class_name is sent correctly.
      const res = await studentAPI.bulkCreate({ students: validRows });

      setBulkResults(res?.data);
      toast.success(`Created ${res?.data?.count || 0} students`);
      setShowBulkModal(false);
      fetchStudents();
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Bulk create failed';
      toast.error(msg);
      setBulkResults(err?.response?.data || null);
    } finally {
      setBulkSubmitting(false);
    }
  };

  const openEditModal = (student) => {
    setSelectedStudent(student);
    setFormData({
      std: student.std || '',
      roll_no: student.roll_no || '',
      first_name: student.first_name || '',
      middle_name: student.middle_name || '',
      last_name: student.last_name || '',
      gender: student.gender || '',
      phone1: student.phone1 || '',
      phone2: student.phone2 || '',
      address: student.address || '',
      pin: student.pin || '',
      class_code: student.class_code || '',
      class_name: student.class_name || '',
      password: '',
      fees: student.fees || '',
      shift: student.shift || '',
      stream: student.stream || '',
      medium: student.medium || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this student?')) {
      try {
        await studentAPI.delete(id);
        toast.success('Student deleted successfully');
        fetchStudents();
      } catch (error) {
        toast.error('Error deleting student');
      }
    }
  };

  const handleFormSubmit = async (e: any) => {
    e.preventDefault();
    try {
      const required = ['std', 'class_name', 'first_name', 'last_name', 'medium'];
      const missing = required.filter((f) => !formData[f] || String(formData[f]).trim() === '');
      if (missing.length) {
        toast.error(`Please fill required fields: ${missing.join(', ')}`);
        return;
      }

      // Validate standard
      const standardNum = Number(formData.std);

      // Validate stream for standards 11-12
      if (standardNum >= 11 && !formData.stream) {
        toast.error('Stream is compulsory for standards 11 and 12');
        return;
      }

      const payload: any = { ...formData };
      payload.fees = payload.fees ? Number(payload.fees) : 0;

      if (selectedStudent) {
        await studentAPI.update(selectedStudent._id || selectedStudent.id, payload);
        toast.success('Student updated');
      } else {
        const res = await studentAPI.register(payload);
        if (res?.data?.generated_password) {
          toast.success(`Student added. Password: ${res.data.generated_password}`);
        } else {
          toast.success('Student added');
        }
      }
      setShowModal(false);
      fetchStudents();
    } catch (err) {
      const data = err.response?.data;
      if (data?.message === 'Validation error' && data.errors) {
        const msgs = Object.keys(data.errors).map((k) => `${k}: ${data.errors[k]}`);
        toast.error(msgs.join(' | '));
      } else if (data?.message) {
        toast.error(data.message);
      } else {
        toast.error('Error saving student');
      }
    }
  };

  const streamOptions = getStreamOptions(formData.std);

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm('');
    setSelectedClassFilter('');
    setSelectedStdFilter('');
  };

  // Card View Component
  const StudentCard = ({ student, index }) => {
    // Get color based on standard
    const getStandardColor = (std) => {
      const num = Number(std);
      if (num >= 11) return 'bg-purple-100 text-purple-800';
      if (num >= 9) return 'bg-blue-100 text-blue-800';
      if (num >= 6) return 'bg-green-100 text-green-800';
      return 'bg-orange-100 text-orange-800';
    };

    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow duration-200">
        {/* Card Header with Avatar */}
        <div className="bg-gradient-to-r from-primary-500 to-primary-600 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 rounded-full bg-white bg-opacity-20 flex items-center justify-center">
                <span className="text-white font-bold text-lg">
                  {student.first_name?.charAt(0)}{student.last_name?.charAt(0)}
                </span>
              </div>
              <div>
                <h3 className="text-white font-semibold text-sm">
                  {student.first_name} {student.middle_name} {student.last_name}
                </h3>
                <p className="text-white text-xs opacity-90">GR: {student.gr_number}</p>
              </div>
            </div>
            <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${student.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {student.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>

        {/* Card Body */}
        <div className="p-4 space-y-3">
          {/* Basic Info Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-gray-500 font-medium">Roll Number</p>
              <p className="text-sm font-semibold text-gray-900">{student.roll_no || index + 1}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Standard</p>
              <p className="text-sm">
                <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${getStandardColor(student.std)}`}>
                  Class {student.std}
                </span>
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Class/Section</p>
              <p className="text-sm font-medium text-gray-900">{student.class_name || 'Not Assigned'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Medium</p>
              <p className="text-sm text-gray-700">{student.medium || 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Gender</p>
              <p className="text-sm text-gray-700 flex items-center gap-1">
                {student.gender === 'Male' ? <FaMale className="text-blue-500 text-xs" /> : 
                 student.gender === 'Female' ? <FaFemale className="text-pink-500 text-xs" /> : 
                 <FaUserGraduate className="text-gray-500 text-xs" />}
                {student.gender || 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Shift</p>
              <p className="text-sm text-gray-700">{student.shift || 'N/A'}</p>
            </div>
            {student.stream && (
              <div className="col-span-2">
                <p className="text-xs text-gray-500 font-medium">Stream</p>
                <p className="text-sm text-gray-700">{student.stream}</p>
              </div>
            )}
            <div className="col-span-2">
              <p className="text-xs text-gray-500 font-medium">Contact</p>
              <p className="text-sm text-gray-700">{student.phone1 || 'No phone'}</p>
            </div>
            {student.address && (
              <div className="col-span-2">
                <p className="text-xs text-gray-500 font-medium">Address</p>
                <p className="text-sm text-gray-600 line-clamp-2">{student.address}</p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-gray-100 flex justify-end space-x-2">
            <button
              onClick={() => navigate(`/admin/student-history/${student._id || student.id}`)}
              className="px-3 py-1.5 text-xs font-medium text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-colors"
              title="View History"
            >
              <FaHistory className="inline mr-1" /> History
            </button>
            <button
              onClick={() => openEditModal(student)}
              className="px-3 py-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
              title="Edit"
            >
              <FaEdit className="inline mr-1" /> Edit
            </button>
            <button
              onClick={() => handleDelete(student._id || student.id)}
              className="px-3 py-1.5 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
              title="Delete"
            >
              <FaTrash className="inline mr-1" /> Delete
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Students Management</h1>
          <p className="text-gray-600 mt-1">Manage all students in your school</p>
        </div>
        <div className="flex items-center gap-2">
          {/* View Toggle Buttons */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 mr-2">
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 rounded-md text-sm transition-all flex items-center gap-1 ${
                viewMode === 'table' 
                  ? 'bg-white text-primary-600 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              title="Table View"
            >
              <FaTable className="text-xs" />
              <span className="hidden sm:inline">Table</span>
            </button>
            <button
              onClick={() => setViewMode('card')}
              className={`px-3 py-1.5 rounded-md text-sm transition-all flex items-center gap-1 ${
                viewMode === 'card' 
                  ? 'bg-white text-primary-600 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              title="Card View"
            >
              <FaThLarge className="text-xs" />
              <span className="hidden sm:inline">Cards</span>
            </button>
          </div>
          <button onClick={openBulkModal} className="btn-secondary flex items-center space-x-2 px-3 py-2 text-sm">
            <FaPlus className="text-sm" />
            <span>Bulk Add</span>
          </button>
          <button onClick={openAddModal} className="btn-primary flex items-center space-x-2 px-3 py-2 text-sm">
            <FaPlus className="text-sm" />
            <span>Add Student</span>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card p-3">
          <p className="text-xs text-gray-600">Total Students</p>
          <p className="text-xl font-bold text-primary-600">{students.length}</p>
        </div>
        <div className="card p-3">
          <p className="text-xs text-gray-600">Active Students</p>
          <p className="text-xl font-bold text-green-600">
            {students.filter((s) => s.is_active).length}
          </p>
        </div>
        <div className="card p-3">
          <p className="text-xs text-gray-600">Male Students</p>
          <p className="text-xl font-bold text-blue-600">
            {students.filter((s) => s.gender === 'Male').length}
          </p>
        </div>
        <div className="card p-3">
          <p className="text-xs text-gray-600">Female Students</p>
          <p className="text-xl font-bold text-pink-600">
            {students.filter((s) => s.gender === 'Female').length}
          </p>
        </div>
      </div>

      {/* Search and Filter Section */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search Input */}
          <div className="flex-1 relative">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm" />
            <input
              type="text"
              placeholder="Search by name or GR number..."
              value={searchTerm}
              onChange={(e: any) => setSearchTerm(e.target.value)}
              className="input-field pl-10 py-2 text-sm w-full"
            />
          </div>
          
          {/* Standard Filter Dropdown */}
          <div className="sm:w-48 relative">
            <FaFilter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm" />
            <select
              value={selectedStdFilter}
              onChange={(e) => setSelectedStdFilter(e.target.value)}
              className="input-field pl-10 py-2 text-sm w-full appearance-none"
            >
              <option value="">All Standards</option>
              {getUniqueStandards().map((std: any) => (
                <option key={std} value={std}>
                  Class {std}
                </option>
              ))}
            </select>
          </div>
          
          {/* Class Filter Dropdown */}
          <div className="sm:w-48 relative">
            <FaFilter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm" />
            <select
              value={selectedClassFilter}
              onChange={(e) => setSelectedClassFilter(e.target.value)}
              className="input-field pl-10 py-2 text-sm w-full appearance-none"
            >
              <option value="">All Sections</option>
              {getUniqueClasses().map((className: any) => (
                <option key={className} value={className}>
                  Section {className}
                </option>
              ))}
            </select>
          </div>
          
          {/* Clear Filters Button */}
          {(searchTerm || selectedClassFilter || selectedStdFilter) && (
            <button
              onClick={clearFilters}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors whitespace-nowrap"
            >
              Clear Filters
            </button>
          )}
        </div>
        
        {/* Active Filters Display */}
        {(searchTerm || selectedClassFilter || selectedStdFilter) && (
          <div className="mt-3 flex flex-wrap gap-2">
            {selectedStdFilter && (
              <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded-full">
                Standard: {selectedStdFilter}
                <button onClick={() => setSelectedStdFilter('')} className="hover:text-purple-900">×</button>
              </span>
            )}
            {selectedClassFilter && (
              <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-primary-100 text-primary-700 rounded-full">
                Section: {selectedClassFilter}
                <button onClick={() => setSelectedClassFilter('')} className="hover:text-primary-900">×</button>
              </span>
            )}
            {searchTerm && (
              <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full">
                Search: {searchTerm}
                <button onClick={() => setSearchTerm('')} className="hover:text-blue-900">×</button>
              </span>
            )}
            <span className="text-xs text-gray-500 ml-2">
              Showing {filteredStudents.length} of {students.length} students
            </span>
          </div>
        )}
      </div>

      {/* Conditional Rendering: Table View or Card View */}
      {viewMode === 'table' ? (
        /* Table View */
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto shadow-sm">
            <div className="inline-block min-w-full align-middle">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Roll No
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      GR Id
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Student Name
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Class
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Standard
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Medium
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Gender
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Shift
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Stream
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Contact
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Status
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredStudents.map((student, index) => (
                    <tr key={student.id} className="hover:bg-gray-50">
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500">
                        {student.roll_no || index + 1}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                        {student.gr_number}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-7 w-7 flex-shrink-0 sm:h-8 sm:w-8">
                            <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-primary-100 flex items-center justify-center">
                              <span className="text-primary-600 font-medium text-xs">
                                {student.first_name?.charAt(0)}
                                {student.last_name?.charAt(0)}
                              </span>
                            </div>
                          </div>
                          <div className="ml-2">
                            <div className="text-sm font-medium text-gray-900">
                              {student.first_name} {student.middle_name} {student.last_name}
                            </div>
                          </div>
                        </div>
                       </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500">
                        {student.class_name || 'Not Assigned'}
                       </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500">
                        {student.std}
                       </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500">
                        {student.medium || 'N/A'}
                       </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500">
                        {student.gender}
                       </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500">
                        {student.shift || 'N/A'}
                       </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500">
                        {student.stream || 'N/A'}
                       </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500">
                        {student.phone1}
                       </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${student.is_active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                            }`}
                        >
                          {student.is_active ? 'Active' : 'Inactive'}
                        </span>
                       </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-1.5">
                          <button
                            onClick={() => navigate(`/admin/student-history/${student._id || student.id}`)}
                            className="text-primary-600 hover:text-primary-900 p-1"
                            title="View History"
                          >
                            <FaHistory className="text-sm" />
                          </button>
                          <button
                            onClick={() => openEditModal(student)}
                            className="text-blue-600 hover:text-blue-900 p-1"
                            title="Edit"
                          >
                            <FaEdit className="text-sm" />
                          </button>
                          <button
                            onClick={() => handleDelete(student._id || student.id)}
                            className="text-red-600 hover:text-red-900 p-1"
                            title="Delete"
                          >
                            <FaTrash className="text-sm" />
                          </button>
                        </div>
                       </td>
                    </tr>
                  ))}
                </tbody>
               </table>
            </div>
          </div>
          {filteredStudents.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No students found matching the filters</p>
            </div>
          )}
        </div>
      ) : (
        /* Card View */
        <div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredStudents.map((student, index) => (
              <StudentCard key={student.id} student={student} index={index} />
            ))}
          </div>
          {filteredStudents.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No students found matching the filters</p>
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Student Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">{selectedStudent ? 'Edit Student' : 'Add Student'}</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-700 text-xl">✕</button>
            </div>
            <form onSubmit={handleFormSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Standard */}
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">
                  Standard <span className="text-red-500">*</span>
                </label>
                <select
                  name="std"
                  value={formData.std}
                  onChange={handleFormChange}
                  className="input-field py-2 text-sm"
                  required
                >
                  <option value="">Select Standard</option>
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'].map(s => (
                    <option key={s} value={s}>Class {s}</option>
                  ))}
                </select>
              </div>

              {/* Class Name (Section) */}
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">
                  Class (Section) <span className="text-red-500">*</span>
                </label>
                <select
                  name="class_name"
                  value={formData.class_name}
                  onChange={handleFormChange}
                  className="input-field py-2 text-sm"
                  required
                >
                  <option value="">Select Class</option>
                  {['A', 'B', 'C', 'D'].map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Roll Number */}
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">
                  Roll Number
                </label>
                <input
                  name="roll_no"
                  value={formData.roll_no}
                  onChange={handleFormChange}
                  placeholder="Enter roll number"
                  className="input-field py-2 text-sm"
                />
              </div>

              {/* First Name */}
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleFormChange}
                  placeholder="Enter first name"
                  className="input-field py-2 text-sm"
                  required
                />
              </div>

              {/* Middle Name */}
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">
                  Middle Name
                </label>
                <input
                  name="middle_name"
                  value={formData.middle_name}
                  onChange={handleFormChange}
                  placeholder="Enter middle name"
                  className="input-field py-2 text-sm"
                />
              </div>

              {/* Last Name */}
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleFormChange}
                  placeholder="Enter last name"
                  className="input-field py-2 text-sm"
                  required
                />
              </div>

              {/* Medium */}
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">
                  Medium <span className="text-red-500">*</span>
                </label>
                <select
                  name="medium"
                  value={formData.medium}
                  onChange={handleFormChange}
                  className="input-field py-2 text-sm"
                  required
                >
                  <option value="">Select Medium</option>
                  <option value="English">English</option>
                  <option value="Gujarati">Gujarati</option>
                  <option value="Hindi">Hindi</option>
                </select>
              </div>

              {/* Gender */}
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">
                  Gender
                </label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleFormChange}
                  className="input-field py-2 text-sm"
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Stream - Only show for standards 9-12 */}
              {streamOptions.length > 0 && (
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Stream {Number(formData.std) >= 11 && <span className="text-red-500">*</span>}
                  </label>
                  <select
                    name="stream"
                    value={formData.stream}
                    onChange={handleFormChange}
                    className="input-field py-2 text-sm"
                    required={Number(formData.std) >= 11}
                  >
                    <option value="">Select Stream</option>
                    {streamOptions.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Primary Phone */}
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">
                  Primary Phone
                </label>
                <input
                  name="phone1"
                  value={formData.phone1}
                  onChange={handleFormChange}
                  placeholder="Enter primary phone number"
                  className="input-field py-2 text-sm"
                />
              </div>

              {/* Secondary Phone */}
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">
                  Secondary Phone
                </label>
                <input
                  name="phone2"
                  value={formData.phone2}
                  onChange={handleFormChange}
                  placeholder="Enter secondary phone number"
                  className="input-field py-2 text-sm"
                />
              </div>

              {/* Address */}
              <div className="space-y-1 col-span-1 md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">
                  Address
                </label>
                <input
                  name="address"
                  value={formData.address}
                  onChange={handleFormChange}
                  placeholder="Enter complete address"
                  className="input-field py-2 text-sm"
                />
              </div>

              {/* PIN Code */}
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">
                  PIN Code
                </label>
                <input
                  name="pin"
                  value={formData.pin}
                  onChange={handleFormChange}
                  placeholder="Enter PIN code"
                  className="input-field py-2 text-sm"
                />
              </div>

              {/* Class Code */}
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">
                  Class Code
                </label>
                <input
                  name="class_code"
                  value={formData.class_code}
                  onChange={handleFormChange}
                  placeholder="e.g., CLS-10A"
                  className="input-field py-2 text-sm"
                />
              </div>

              {/* Password */}
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <input
                  name="password"
                  value={formData.password}
                  onChange={handleFormChange}
                  placeholder="Leave empty for auto-generate"
                  type="password"
                  className="input-field py-2 text-sm"
                />
                <p className="text-xs text-gray-500">Optional - leave blank to auto-generate</p>
              </div>

              {/* Fees */}
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">
                  Fees Amount
                </label>
                <input
                  name="fees"
                  value={formData.fees}
                  onChange={handleFormChange}
                  placeholder="Enter fees amount"
                  type="number"
                  className="input-field py-2 text-sm"
                />
              </div>

              {/* Shift */}
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">
                  Shift
                </label>
                <select
                  name="shift"
                  value={formData.shift}
                  onChange={handleFormChange}
                  className="input-field py-2 text-sm"
                >
                  <option value="">Select Shift</option>
                  <option value="Morning">Morning</option>
                  <option value="Afternoon">Afternoon</option>
                </select>
              </div>

              <div className="col-span-1 md:col-span-2 flex justify-end space-x-2 mt-3">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary px-3 py-1.5 text-sm">Cancel</button>
                <button type="submit" className="btn-primary px-3 py-1.5 text-sm">Save Student</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Add Students Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 p-4">
          <div className="bg-white rounded-lg w-full max-w-[95vw] max-h-[90vh] overflow-hidden flex flex-col shadow-xl">
            {/* Modal Header */}
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <div>
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <FaTable className="text-primary-600" />
                  Bulk Student Creator
                </h3>
                <p className="text-xs text-gray-500">Add multiple students at once with shared attributes</p>
              </div>
              <button onClick={() => setShowBulkModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <FaTimes size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {/* Apply All Section (Dropdowns) */}
              <div className="bg-primary-50 rounded-xl p-4 border border-primary-100">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {/* Standard */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold text-primary-700 uppercase tracking-wider">Standard *</label>
                      <button onClick={() => applyToAll('std')} className="text-[10px] font-bold text-blue-600 hover:underline">APPLY ALL</button>
                    </div>
                    <select
                      value={bulkApplyAll.std}
                      onChange={(e) => setBulkApplyAll({ ...bulkApplyAll, std: e.target.value })}
                      className="input-field py-1.5 text-xs bg-white border-primary-200"
                    >
                      <option value="">Select Std</option>
                      {['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'].map(s => (
                        <option key={s} value={s}>Class {s}</option>
                      ))}
                    </select>
                  </div>

                  {/* Class */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold text-primary-700 uppercase tracking-wider">Class *</label>
                      <button onClick={() => applyToAll('class_name')} className="text-[10px] font-bold text-blue-600 hover:underline">APPLY ALL</button>
                    </div>
                    <select
                      value={bulkApplyAll.class_name}
                      onChange={(e) => setBulkApplyAll({ ...bulkApplyAll, class_name: e.target.value })}
                      className="input-field py-1.5 text-xs bg-white border-primary-200"
                    >
                      <option value="">Select Class</option>
                      {['A', 'B', 'C', 'D'].map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  {/* Shift */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold text-primary-700 uppercase tracking-wider">Shift</label>
                      <button onClick={() => applyToAll('shift')} className="text-[10px] font-bold text-blue-600 hover:underline">APPLY ALL</button>
                    </div>
                    <select
                      value={bulkApplyAll.shift}
                      onChange={(e) => setBulkApplyAll({ ...bulkApplyAll, shift: e.target.value })}
                      className="input-field py-1.5 text-xs bg-white border-primary-200"
                    >
                      <option value="">Select Shift</option>
                      <option value="Morning">Morning</option>
                      <option value="Afternoon">Afternoon</option>
                    </select>
                  </div>

                  {/* Gender */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold text-primary-700 uppercase tracking-wider">Gender</label>
                      <button onClick={() => applyToAll('gender')} className="text-[10px] font-bold text-blue-600 hover:underline">APPLY ALL</button>
                    </div>
                    <select
                      value={bulkApplyAll.gender}
                      onChange={(e) => setBulkApplyAll({ ...bulkApplyAll, gender: e.target.value })}
                      className="input-field py-1.5 text-xs bg-white border-primary-200"
                    >
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>

                  {/* Stream */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold text-primary-700 uppercase tracking-wider">Stream</label>
                      <button onClick={() => applyToAll('stream')} className="text-[10px] font-bold text-blue-600 hover:underline">APPLY ALL</button>
                    </div>
                    <select
                      value={bulkApplyAll.stream}
                      onChange={(e) => setBulkApplyAll({ ...bulkApplyAll, stream: e.target.value })}
                      className="input-field py-1.5 text-xs bg-white border-primary-200"
                    >
                      <option value="">Select Stream</option>
                      <option value="Primary">Primary</option>
                      <option value="Secondary">Secondary</option>
                      <option value="Commerce">Commerce</option>
                      <option value="Science-Maths">Science-Maths</option>
                      <option value="Science-Bio">Science-Bio</option>
                    </select>
                  </div>

                  {/* Medium */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold text-primary-700 uppercase tracking-wider">Medium *</label>
                      <button onClick={() => applyToAll('medium')} className="text-[10px] font-bold text-blue-600 hover:underline">APPLY ALL</button>
                    </div>
                    <select
                      value={bulkApplyAll.medium}
                      onChange={(e) => setBulkApplyAll({ ...bulkApplyAll, medium: e.target.value })}
                      className="input-field py-1.5 text-xs bg-white border-primary-200"
                    >
                      <option value="">Select Medium</option>
                      <option value="English">English</option>
                      <option value="Gujarati">Gujarati</option>
                      <option value="Hindi">Hindi</option>
                    </select>
                  </div>

                  {/* Fees */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold text-primary-700 uppercase tracking-wider">Fees</label>
                      <button onClick={() => applyToAll('fees')} className="text-[10px] font-bold text-blue-600 hover:underline">APPLY ALL</button>
                    </div>
                    <input
                      type="number"
                      placeholder="Fees"
                      value={bulkApplyAll.fees}
                      onChange={(e) => setBulkApplyAll({ ...bulkApplyAll, fees: e.target.value })}
                      className="input-field py-1.5 text-xs bg-white border-primary-200"
                    />
                  </div>
                  {/* PIN */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold text-primary-700 uppercase tracking-wider">PIN</label>
                      <button onClick={() => applyToAll('pin')} className="text-[10px] font-bold text-blue-600 hover:underline">APPLY ALL</button>
                    </div>
                    <input
                      type="text"
                      placeholder="PIN"
                      value={bulkApplyAll.pin}
                      onChange={(e) => setBulkApplyAll({ ...bulkApplyAll, pin: e.target.value })}
                      className="input-field py-1.5 text-xs bg-white border-primary-200"
                    />
                  </div>

                  {/* Password */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold text-primary-700 uppercase tracking-wider">Password</label>
                      <button onClick={() => applyToAll('password')} className="text-[10px] font-bold text-blue-600 hover:underline">APPLY ALL</button>
                    </div>
                    <input
                      type="text"
                      placeholder="Password"
                      value={bulkApplyAll.password}
                      onChange={(e) => setBulkApplyAll({ ...bulkApplyAll, password: e.target.value })}
                      className="input-field py-1.5 text-xs bg-white border-primary-200"
                    />
                  </div>
                </div>
              </div>

              {/* Bulk Input Area */}
              <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3 shadow-sm">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Paste Student Data</label>
                <div className="relative">
                  <textarea
                    value={bulkInputText}
                    onChange={(e) => setBulkInputText(e.target.value)}
                    placeholder="Example: First Name: Aarav | Last Name: Patel | Phone1: 9876543210 | Phone2: 9823456712 | Address: Adajan, Surat"
                    className="input-field min-h-[120px] text-xs font-mono pt-2"
                  />
                  <div className="absolute bottom-3 right-3 flex items-center gap-2">
                    <span className="text-[10px] text-gray-400">{bulkInputText.split('\n').filter(l => l.trim()).length} rows detected</span>
                    <button
                      onClick={handleAddToList}
                      className="btn-primary py-1.5 px-4 text-xs shadow-md"
                    >
                      + Add to List
                    </button>
                  </div>
                </div>
                <p className="text-[10px] text-gray-500 italic">Tip: You can paste your list here in the "Field: Value | Field: Value" format or simply as Excel columns.</p>
              </div>

              {/* Data Entry Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-gray-700">{bulkRows.length} Student(s) to create</h4>
                    <p className="text-[10px] text-gray-500 italic">Tip: You can copy rows from Excel and paste here to auto-fill</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setBulkRows([])} className="text-xs text-red-600 hover:underline">Clear All</button>
                    <button onClick={addBulkRow} className="btn-secondary py-1 px-3 text-xs flex items-center gap-1">
                      <FaPlus className="text-[10px]" /> Add Row
                    </button>
                  </div>
                </div>

                <div className="border border-gray-200 rounded-lg overflow-x-auto" onPaste={handlePaste}>
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-[10px] font-bold text-gray-500 uppercase">#</th>
                        <th className="px-3 py-2 text-left text-[10px] font-bold text-gray-500 uppercase">Roll No</th>
                        <th className="px-3 py-2 text-left text-[10px] font-bold text-gray-500 uppercase">First Name *</th>
                        <th className="px-3 py-2 text-left text-[10px] font-bold text-gray-500 uppercase">Middle Name</th>
                        <th className="px-3 py-2 text-left text-[10px] font-bold text-gray-500 uppercase">Last Name *</th>
                        <th className="px-3 py-2 text-left text-[10px] font-bold text-gray-500 uppercase">Phone 1</th>
                        <th className="px-3 py-2 text-left text-[10px] font-bold text-gray-500 uppercase">Phone 2</th>
                        <th className="px-3 py-2 text-left text-[10px] font-bold text-gray-500 uppercase">Address</th>
                        <th className="px-3 py-2 text-left text-[10px] font-bold text-gray-500 uppercase">PIN</th>
                        <th className="px-3 py-2 text-left text-[10px] font-bold text-gray-500 uppercase">Password</th>
                        <th className="px-3 py-2 text-left text-[10px] font-bold text-gray-500 uppercase">Std *</th>
                        <th className="px-3 py-2 text-left text-[10px] font-bold text-gray-500 uppercase">Class *</th>
                        <th className="px-3 py-2 text-left text-[10px] font-bold text-gray-500 uppercase">Medium *</th>
                        <th className="px-3 py-2 text-center text-[10px] font-bold text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {bulkRows.map((row, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-3 py-2 text-xs text-gray-500 font-mono">{idx + 1}</td>
                          <td className="px-2 py-2">
                            <input
                              value={row.roll_no}
                              onChange={(e) => handleBulkRowChange(idx, 'roll_no', e.target.value)}
                              placeholder="Roll No"
                              className="w-full border-none focus:ring-0 text-xs p-0 bg-transparent font-mono"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              value={row.first_name}
                              onChange={(e) => handleBulkRowChange(idx, 'first_name', e.target.value)}
                              placeholder="First Name"
                              className="w-full border-none focus:ring-0 text-xs p-0 bg-transparent"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              value={row.middle_name}
                              onChange={(e) => handleBulkRowChange(idx, 'middle_name', e.target.value)}
                              placeholder="Middle Name"
                              className="w-full border-none focus:ring-0 text-xs p-0 bg-transparent"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              value={row.last_name}
                              onChange={(e) => handleBulkRowChange(idx, 'last_name', e.target.value)}
                              placeholder="Last Name"
                              className="w-full border-none focus:ring-0 text-xs p-0 bg-transparent"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              value={row.phone1}
                              onChange={(e) => handleBulkRowChange(idx, 'phone1', e.target.value)}
                              placeholder="Phone 1"
                              className="w-full border-none focus:ring-0 text-xs p-0 bg-transparent font-mono"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              value={row.phone2}
                              onChange={(e) => handleBulkRowChange(idx, 'phone2', e.target.value)}
                              placeholder="Phone 2"
                              className="w-full border-none focus:ring-0 text-xs p-0 bg-transparent font-mono"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              value={row.address}
                              onChange={(e) => handleBulkRowChange(idx, 'address', e.target.value)}
                              placeholder="Address"
                              className="w-full border-none focus:ring-0 text-xs p-0 bg-transparent"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              value={row.pin}
                              onChange={(e) => handleBulkRowChange(idx, 'pin', e.target.value)}
                              placeholder="PIN"
                              className="w-full border-none focus:ring-0 text-xs p-0 bg-transparent"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              value={row.password}
                              onChange={(e) => handleBulkRowChange(idx, 'password', e.target.value)}
                              placeholder="Password"
                              className="w-full border-none focus:ring-0 text-xs p-0 bg-transparent"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <select
                              value={row.std}
                              onChange={(e) => handleBulkRowChange(idx, 'std', e.target.value)}
                              className="w-full border-none focus:ring-0 text-xs p-0 bg-transparent"
                            >
                              <option value="">Std</option>
                              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'].map(s => (
                                <option key={s} value={s}>{s}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-2 py-2">
                            <select
                              value={row.class_name}
                              onChange={(e) => handleBulkRowChange(idx, 'class_name', e.target.value)}
                              className="w-full border-none focus:ring-0 text-xs p-0 bg-transparent"
                            >
                              <option value="">Class</option>
                              {['A', 'B', 'C', 'D'].map(c => (
                                <option key={c} value={c}>{c}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-2 py-2">
                            <select
                              value={row.medium}
                              onChange={(e) => handleBulkRowChange(idx, 'medium', e.target.value)}
                              className="w-full border-none focus:ring-0 text-xs p-0 bg-transparent"
                            >
                              <option value="">Medium</option>
                              <option value="English">English</option>
                              <option value="Gujarati">Gujarati</option>
                              <option value="Hindi">Hindi</option>
                            </select>
                          </td>
                          <td className="px-3 py-2 text-center">
                            <button onClick={() => removeBulkRow(idx)} className="text-red-400 hover:text-red-600">
                              <FaTrash className="text-[10px]" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {bulkRows.length === 0 && (
                  <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                    <button onClick={addBulkRow} className="text-primary-600 font-medium text-xs hover:underline">+ Add your first student row</button>
                  </div>
                )}
              </div>

              {/* Bulk Results */}
              {bulkResults && (
                <div className={`p-4 rounded-lg border ${bulkResults.success ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    {bulkResults.success ? <FaCheck className="text-green-600" /> : <FaTimes className="text-red-600" />}
                    <span className={`text-sm font-bold ${bulkResults.success ? 'text-green-800' : 'text-red-800'}`}>
                      {bulkResults.success ? `Successfully created ${bulkResults.count} students` : 'Bulk creation failed'}
                    </span>
                  </div>
                  {bulkResults.errors && bulkResults.errors.length > 0 && (
                    <div className="mt-2 text-xs text-red-700 space-y-1 max-h-32 overflow-y-auto">
                      {bulkResults.errors.map((err: any, i: number) => (
                        <p key={i}>Row {err.index + 1}: {err.message}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-100 flex items-center justify-between bg-gray-50">
              <span className="text-xs text-gray-500">Ready to create {bulkRows.filter(r => r.first_name && r.last_name && r.std && r.medium).length} student(s)</span>
              <div className="flex gap-3">
                <button onClick={() => setShowBulkModal(false)} className="btn-secondary px-6 py-2 text-sm">Cancel</button>
                <button
                  onClick={handleBulkSubmit}
                  disabled={bulkSubmitting || bulkRows.length === 0}
                  className="btn-primary px-8 py-2 text-sm shadow-lg shadow-primary-200 disabled:opacity-50"
                >
                  {bulkSubmitting ? 'Creating...' : 'Create Students'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Students;