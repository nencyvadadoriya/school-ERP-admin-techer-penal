import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FaArrowLeft } from 'react-icons/fa';

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [sent, setSent] = useState<boolean>(false);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setSent(true);
    toast.success('Reset link sent!');
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-6">
        <Link to="/login" className="inline-flex items-center text-primary-600 mb-4 text-sm">
          <FaArrowLeft className="mr-2" /> Back to Login
        </Link>
        <h2 className="text-2xl font-bold mb-2">Forgot Password?</h2>
        <p className="text-gray-600 text-sm mb-6">
          {sent ? 'Check your email' : 'Enter your email to reset'}
        </p>
        {!sent ? (
          <form onSubmit={handleSubmit}>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field w-full px-3 py-2 mb-4"
              placeholder="Email"
              required
            />
            <button type="submit" disabled={loading} className="w-full btn-primary py-2">
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>
        ) : (
          <Link to="/login" className="btn-primary block text-center py-2">
            Back to Login
          </Link>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
