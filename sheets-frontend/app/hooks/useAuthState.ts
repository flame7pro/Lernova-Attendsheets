'use client';

import { useState } from 'react';

export const useAuthState = () => {
  const [showVerification, setShowVerification] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');

  const handleBackToAuth = () => {
    setShowVerification(false);
    setVerificationEmail('');
  };

  return {
    showVerification,
    setShowVerification,
    verificationEmail,
    setVerificationEmail,
    handleBackToAuth,
  };
};