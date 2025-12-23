'use client';

import React from 'react';
import Link from 'next/link';
import { Users, ArrowLeft, Target, Heart, Shield, Check, Linkedin, Twitter, Github } from 'lucide-react';

// Navigation Component
function Navigation() {
  return (
     <nav className="fixed top-0 left-0 right-0 z-50 border-b border-emerald-200/60 bg-white/80 backdrop-blur-xl shadow-sm">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-md">
            <img src="/logo.png" alt="Lernova Attendsheets Logo" className="w-10 h-10" />
          </div>
          <span className="text-xl font-bold text-emerald-900"> <Link href="/">Lernova Attendsheets </Link></span></div>

        <div className="hidden md:flex items-center gap-8">
          <Link href="/" className="text-md font-medium text-slate-600 hover:text-emerald-600 transition-colors">Home</Link>
          <Link href="/about" className="text-md font-medium text-emerald-600">About Us</Link>
          <Link href="/contact" className="text-md font-medium text-slate-600 hover:text-emerald-600 transition-colors">Contact</Link>
          <Link href="/auth" className="px-6 py-2.5 bg-emerald-600 text-white text-md font-medium rounded-lg hover:bg-emerald-700 hover:shadow-lg transition-all">Sign Up</Link>
        </div>
      </div>
    </nav>
  );
}

// Hero Section
function HeroSection() {
  return (
    <section className="pt-32 px-6">
      <div className="max-w-6xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-2 text-emerald-600 hover:text-emerald-700 font-medium mb-8 transition-colors">
          <ArrowLeft className="w-5 h-5" />
          Back to Home
        </Link>

        <div className="text-center mb-4">
          <h1 className="text-6xl font-bold text-slate-900 mb-6">About Lernova Attendsheets</h1>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
            We're transforming how educators manage attendance with modern technology and intuitive design.
          </p>
        </div>
      </div>
    </section>
  );
}

// Mission, Vision, Values Section
function MVVSection() {
  const mvvItems = [
    {
      icon: Target,
      title: 'Our Mission',
      description: 'To empower educators with tools that simplify attendance management, enabling them to focus on teaching and supporting their students.',
      color: 'emerald'
    },
    {
      icon: Heart,
      title: 'Our Vision',
      description: 'To become the world\'s most trusted attendance management platform, revolutionizing education through innovative technology.',
      color: 'teal'
    },
    {
      icon: Shield,
      title: 'Our Values',
      description: 'Innovation, integrity, and user-first design guide every decision we make. Your success is our success.',
      color: 'cyan'
    }
  ];

  return (
    <section className="py-20 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-3 gap-8 mb-20">
          {mvvItems.map((item, idx) => {
            const Icon = item.icon;
            const colorMap = {
              emerald: { bg: 'from-emerald-100 to-emerald-200', icon: 'text-emerald-600', border: 'border-emerald-100' },
              teal: { bg: 'from-teal-100 to-teal-200', icon: 'text-teal-600', border: 'border-teal-100' },
              cyan: { bg: 'from-cyan-100 to-cyan-200', icon: 'text-cyan-600', border: 'border-cyan-100' }
            };
            const colors = colorMap[item.color as keyof typeof colorMap];

            return (
              <div key={idx} className={`bg-white rounded-2xl p-8 shadow-md border ${colors.border} text-center hover:shadow-xl transition-all`}>
                <div className={`w-16 h-16 bg-linear-to-br ${colors.bg} rounded-xl flex items-center justify-center mx-auto mb-5 shadow-sm`}>
                  <Icon className={`w-8 h-8 ${colors.icon}`} />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-3">{item.title}</h3>
                <p className="text-slate-600 leading-relaxed">{item.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// Why Choose Us Section
function WhyChooseUsSection() {
  const reasons = [
    {
      title: 'Built for Educators',
      description: 'Designed with input from teachers and professors to meet real classroom needs. Every feature is crafted with educators in mind.',
      color: 'emerald'
    },
    {
      title: 'Data-Driven Decisions',
      description: 'Make informed decisions with comprehensive analytics and performance metrics that help you identify at-risk students early.',
      color: 'teal'
    },
    {
      title: 'Secure & Reliable',
      description: 'Your student data is protected with industry-standard security measures. We take privacy and data protection seriously.',
      color: 'cyan'
    },
    {
      title: 'Easy to Use',
      description: 'Intuitive interface that requires no training. Start tracking attendance in minutes, not hours.',
      color: 'emerald'
    },
    {
      title: 'Flexible & Customizable',
      description: 'Add custom fields, import data from multiple formats, and export reports that fit your needs.',
      color: 'teal'
    },
    {
      title: 'Always Improving',
      description: 'Regular updates and new features based on user feedback. We\'re constantly evolving to serve you better.',
      color: 'cyan'
    }
  ];

  const colorMap = {
    emerald: 'bg-emerald-100',
    teal: 'bg-teal-100',
    cyan: 'bg-cyan-100'
  };

  return (
    <section className="py-24 px-6 bg-white/50 backdrop-blur">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-4xl font-bold text-slate-900 mb-12 text-center">Why Choose Us?</h2>

        <div className="grid md:grid-cols-2 gap-8">
          {reasons.map((reason, idx) => (
            <div key={idx} className="flex items-start gap-4">
              <div className={`w-12 h-12 ${colorMap[reason.color as keyof typeof colorMap]} rounded-xl flex items-center justify-center shrink-0 mt-1`}>
                <Check className={`w-6 h-6 ${reason.color === 'emerald' ? 'text-emerald-600' : reason.color === 'teal' ? 'text-teal-600' : 'text-cyan-600'}`} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">{reason.title}</h3>
                <p className="text-slate-600 leading-relaxed">{reason.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Team/Credits Section
function TeamSection() {
  return (
    <section className="py-24 px-6">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-4xl font-bold text-slate-900 mb-8">Built by Passionate Students</h2>
        <p className="text-xl text-slate-600 mb-12 leading-relaxed">
          Lernova Attendsheets is created by students at Atharva University who understand the challenges educators face. We're committed to building tools that make a real difference in education.
        </p>

        <div className="bg-cyan-100 rounded-4xl p-6 border-10 border-cyan-200">
          <h3 className="text-2xl font-bold text-slate-900 mb-6"><img src="/clogo.png" alt="Lernova Logo" className="w-16 h-16 inline" /> The Lernova Team</h3>
          <div className="space-y-3 text-slate-600">
            <p className="font-semibold">Muhammad Nabeel</p>
            <p className="font-semibold">Rituraj Thakur</p>
            <p className="font-semibold">Archita Parab</p>
            <p className="font-semibold">Shweta Yadav</p>
            <p className="font-semibold">Aksh Devlapalli</p>
            <p className="font-semibold">Mohnish Pembarthi</p>
          </div>
          <p className="text-sm text-slate-500 mt-6">Students at Atharva University, Mumbai</p>
        </div>
      </div>
    </section>
  );
}

// Footer Component
function Footer() {
  return (
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
}

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-linear-to-br from-emerald-50 via-teal-50 to-cyan-50">
      <Navigation />
      <HeroSection />
      <MVVSection />
      <WhyChooseUsSection />
      <TeamSection />
      <Footer />
    </div>
  );
}