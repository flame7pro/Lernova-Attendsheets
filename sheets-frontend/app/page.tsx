'use client';

import React from 'react';
import Link from 'next/link';
import { Users, Calendar, BarChart3, Check, Sparkles, Linkedin, Twitter, Github } from 'lucide-react';

// Reusable Navigation Component
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
          <Link href="/" className="text-md font-medium text-emerald-600">Home</Link>
          <Link href="/about" className="text-md font-medium text-slate-600 hover:text-emerald-600 transition-colors">About Us</Link>
          <Link href="/contact" className="text-md font-medium text-slate-600 hover:text-emerald-600 transition-colors">Contact</Link>
          <Link href="/auth" className="px-6 py-2.5 bg-emerald-600 text-white text-md font-medium rounded-lg hover:bg-emerald-700 hover:shadow-lg transition-all">Sign Up</Link>
        </div>
      </div>
    </nav>
  );
}

// Hero Section Component
function HeroSection() {
  return (
    <section className="pt-32 pb-20 px-6">
      <div className="max-w-6xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium mb-8 shadow-sm">
          <Sparkles className="w-4 h-4" />
          Modern Attendance Management System
        </div>

        <h1 className="text-6xl md:text-7xl font-bold text-slate-900 mb-6 leading-tight">
          Track attendance with
          <span className="block bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent mt-2">
            effortless precision
          </span>
        </h1>

        <p className="text-xl text-slate-600 mb-12 max-w-3xl mx-auto leading-relaxed">
          A beautiful, intuitive platform designed for educators to manage student attendance, track performance, and generate comprehensive insights - All in one powerful dashboard.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link href="/auth" className="px-8 py-4 bg-emerald-600 text-white text-lg font-semibold rounded-xl hover:bg-emerald-700 transition-all shadow-lg hover:shadow-xl">
            Start Tracking Now
          </Link>
          <Link href="/about" className="px-8 py-4 bg-white text-emerald-600 text-lg font-semibold rounded-xl border-2 border-emerald-200 hover:bg-emerald-50 transition-all">
            Learn More
          </Link>
        </div>
      </div>
    </section>
  );
}

// Features Section Component
function FeaturesSection() {
  const features = [
    {
      icon: Calendar,
      title: 'Monthly Tracking',
      description: 'Track attendance day-by-day with an intuitive calendar interface. Mark students as present, absent, or late with just one click.',
      borderColor: 'border-emerald-100',
      bgGradient: 'from-emerald-100 to-emerald-200',
      iconColor: 'text-emerald-600'
    },
    {
      icon: BarChart3,
      title: 'Real-time Insights',
      description: 'Monitor attendance percentages and risk levels instantly. Identify students who need support before it\'s too late.',
      borderColor: 'border-teal-100',
      bgGradient: 'from-teal-100 to-teal-200',
      iconColor: 'text-teal-600'
    },
    {
      icon: Check,
      title: 'Custom Fields',
      description: 'Add custom columns to track emails, phone numbers, sections, or any information that matters to your classes.',
      borderColor: 'border-cyan-100',
      bgGradient: 'from-cyan-100 to-cyan-200',
      iconColor: 'text-cyan-600'
    }
  ];

  return (
    <section className="py-24 px-6 bg-white/50 backdrop-blur">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-5xl font-bold text-center text-slate-900 mb-16">Key Features</h2>

        <div className="grid md:grid-cols-3 gap-8">
          {features.map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <div key={idx} className={`bg-white rounded-2xl p-8 shadow-md border ${feature.borderColor} hover:shadow-xl transition-all hover:-translate-y-1`}>
                <div className={`w-14 h-14 bg-gradient-to-br ${feature.bgGradient} rounded-xl flex items-center justify-center mb-5 shadow-sm`}>
                  <Icon className={`w-7 h-7 ${feature.iconColor}`} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">{feature.title}</h3>
                <p className="text-slate-600 leading-relaxed">{feature.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// Stats Section Component
function StatsSection() {
  const stats = [
    { number: '10K', label: 'Active Users' },
    { number: '500K', label: 'Students Tracked' },
    { number: '50M', label: 'Attendance Records' },
    { number: '99.9%', label: 'Uptime Guaranteed' }
  ];

  return (
    <section className="py-24 px-6">
      <div className="max-w-6xl mx-auto bg-gradient-to-br from-emerald-600 to-teal-600 rounded-3xl p-16 shadow-2xl text-center text-white">
        <h2 className="text-4xl font-bold mb-4">Trusted by Educators Worldwide</h2>
        <p className="text-xl text-emerald-50 mb-12 max-w-2xl mx-auto">
          Join thousands of educators who have transformed their attendance management
        </p>

        <div className="grid md:grid-cols-4 gap-8">
          {stats.map((stat, idx) => (
            <div key={idx}>
              <div className="text-5xl font-bold mb-2">{stat.number}</div>
              <div className="text-emerald-100">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// CTA Section Component
function CTASection() {
  return (
    <section className="py-24 px-6">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-5xl font-bold text-slate-900 mb-6">Ready to get started?</h2>
        <p className="text-xl text-slate-600 mb-12">
          Join thousands of educators managing attendance efficiently with Lernova Attendsheets.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/auth" className="px-8 py-4 bg-emerald-600 text-white text-lg font-semibold rounded-xl hover:bg-emerald-700 transition-all shadow-lg hover:shadow-xl">
            Create Free Account
          </Link>
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
              <div className="w-10 h-1rounded-xl flex items-center justify-center">
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

// Main Page Component
export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
      <Navigation />
      <HeroSection />
      <FeaturesSection />
      <StatsSection />
      <CTASection />
      <Footer />
    </div>
  );
}