'use client';

import React, { useState } from 'react';
import { Users, ArrowLeft, Linkedin, Twitter, Github } from 'lucide-react';
import { AuthForm } from './AuthForm';
import { AuthVerification } from './AuthVerification';
import Link from 'next/link';

interface AuthPageProps {
  onBack: () => void;
  onNavigate: (page: 'landing' | 'about' | 'contact' | 'auth' | 'app') => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onBack, onNavigate }) => {
  const [isSignUpMode, setIsSignUpMode] = useState(true);
  const [showVerification, setShowVerification] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');

  const handleBackToAuth = () => {
    setShowVerification(false);
    setVerificationEmail('');
  };

  if (showVerification) {
    return <AuthVerification email={verificationEmail} onBack={handleBackToAuth} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-emerald-200/60 bg-white/80 backdrop-blur-xl shadow-sm">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-md">
            <img src="/logo.png" alt="Lernova Attendsheets Logo" className="w-10 h-10" />
          </div>
          <span className="text-xl font-bold text-emerald-900"> <Link href="/">Lernova Attendsheets </Link></span></div>

        <div className="hidden md:flex items-center gap-8">
          <Link href="/" className="text-md font-medium text-slate-600 hover:text-emerald-600 transition-colors">Home</Link>
          <Link href="/about" className="text-md font-medium text-slate-600 hover:text-emerald-600 transition-colors">About Us</Link>
          <Link href="/contact" className="text-md font-medium text-slate-600 hover:text-emerald-600 transition-colors">Contact</Link>
          <Link href="/auth" className="px-6 py-2.5 bg-emerald-600 text-white text-md font-medium rounded-lg hover:bg-emerald-700 hover:shadow-lg transition-all">Sign Up</Link>
        </div>
      </div>
    </nav>

      {/* Auth Section */}
      <section className="pt-32 pb-16 px-6">
        <div className="max-w-6xl mx-auto">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-emerald-600 cursor-pointer hover:text-emerald-700 font-medium mb-8 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Home
          </button>

          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Side - Info */}
            <AuthInfo isSignUp={isSignUpMode} />

            {/* Right Side - Form */}
            <AuthForm 
              onModeChange={setIsSignUpMode}
              setShowVerification={setShowVerification}
              setVerificationEmail={setVerificationEmail}
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <AuthFooter onNavigate={onNavigate} />
    </div>
  );
};

const AuthInfo = ({ isSignUp }: { isSignUp: boolean }) => (
  <div>
    <h1 className="text-5xl font-bold text-slate-900 mb-6">
      {isSignUp ? 'Create Your Account' : 'Welcome Back'}
    </h1>
    <p className="text-xl text-slate-600 mb-8 leading-relaxed">
      {isSignUp 
        ? 'Join thousands of educators using Lernova Attendsheets to manage attendance efficiently. Sign up to start managing your classes and tracking attendance.'
        : 'Sign in to continue managing your classes and tracking attendance. Your students are waiting!'}
    </p>

    <div className="space-y-4">
      {isSignUp ? (
        <>
          <AuthFeature icon="✓" title="Easy Setup" description="Get started in minutes with our intuitive interface" color="emerald" />
          <AuthFeature icon="✓" title="Secure & Private" description="Your data is protected with enterprise-grade security" color="teal" />
          <AuthFeature icon="✓" title="Free to Start" description="No credit card required for your first class" color="cyan" />
        </>
      ) : (
        <>
          <AuthFeature icon="✓" title="Quick Access" description="Resume where you left off with instant login" color="emerald" />
          <AuthFeature icon="✓" title="Real-time Sync" description="Your attendance data is always up to date" color="teal" />
          <AuthFeature icon="✓" title="Multi-device" description="Access your classes from anywhere, anytime" color="cyan" />
        </>
      )}
    </div>
  </div>
);

interface AuthFeatureProps {
  icon: string;
  title: string;
  description: string;
  color: 'emerald' | 'teal' | 'cyan';
}

const AuthFeature: React.FC<AuthFeatureProps> = ({ icon, title, description, color }) => {
  const colorClasses = {
    emerald: 'bg-emerald-100 text-emerald-600',
    teal: 'bg-teal-100 text-teal-600',
    cyan: 'bg-cyan-100 text-cyan-600',
  };

  return (
    <div className="flex items-start gap-4">
      <div className={`w-10 h-10 ${colorClasses[color]} rounded-lg flex items-center justify-center flex-shrink-0 mt-1 font-bold`}>
        {icon}
      </div>
      <div>
        <h3 className="font-bold text-slate-900 mb-1">{title}</h3>
        <p className="text-slate-600">{description}</p>
      </div>
    </div>
  );
};

const AuthFooter = ({ onNavigate }: { onNavigate: (page: 'landing' | 'about' | 'contact' | 'auth' | 'app') => void }) => (
  <footer className="bg-slate-900 text-white py-16 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid gap-12 mb-12">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center">
                  <img src="/logo.png" alt="Lernova Attendsheets Logo" className="w-10 h-10" />
                </div>
                <span className="text-xl font-bold">Lernova Attendsheets</span>
              </div>
              <p className="text-slate-400 leading-relaxed">
                Lernova Attendsheets © 2025. All rights reserved.
              </p>
            </div>
          </div>
  
          <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-slate-400 text-sm">
              By Muhammad Nabeel • Rituraj Thakur • Archita Parab • Shweta Yadav • Aksh Devlapalli • Mohnish Pembarthi
              <br />
              Students at Atharva University, Mumbai
            </p>
  
            <div className="flex items-center gap-4">
              <a href="#" className="w-10 h-10 bg-slate-800 hover:bg-emerald-600 rounded-lg flex items-center justify-center transition-colors">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 bg-slate-800 hover:bg-emerald-600 rounded-lg flex items-center justify-center transition-colors">
                <Linkedin className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 bg-slate-800 hover:bg-emerald-600 rounded-lg flex items-center justify-center transition-colors">
                <Github className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>
      </footer>
);