import React, { useState } from 'react';
import { Plus, Settings, LogOut, BookOpen, LayoutDashboard, QrCode } from 'lucide-react';

interface ClassInfo {
  classid: string;
  classname: string;
  teachername: string;
}

interface StudentSidebarProps {
  collapsed: boolean;
  classes: ClassInfo[];
  onEnrollClick: () => void;
  onViewDashboard: () => void;
  onSettings: () => void;
  onLogout: () => void;
  onQRScan: () => void; // NEW
}

export const StudentSidebar: React.FC<StudentSidebarProps> = ({
  collapsed,
  classes,
  onEnrollClick,
  onViewDashboard,
  onSettings,
  onLogout,
  onQRScan, // NEW
}) => {
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const displayedClasses = classes.slice(0, 5);

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    setIsLoggingOut(true);
    setTimeout(() => {
      onLogout();
    }, 1200);
  };

  return (
    <div
      className={`bg-white border-r border-teal-200/60 shadow-sm flex flex-col transition-all duration-300 ease-in-out overflow-hidden ${
        collapsed ? 'w-0 border-r-0' : 'w-72'
      }`}
    >
      <div
        className={`flex-1 overflow-y-auto transition-opacity duration-300 ${
          collapsed ? 'opacity-0' : 'opacity-100'
        } p-6`}
      >
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
              Enroll in Class
            </h3>
            <button
              onClick={onEnrollClick}
              className="p-1.5 hover:bg-teal-50 rounded-lg transition-colors group cursor-pointer"
              title="Enroll in new class"
            >
              <Plus className="w-4 h-4 text-slate-600 group-hover:text-teal-600" />
            </button>
          </div>

          {classes.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <BookOpen className="w-6 h-6 text-slate-400" />
              </div>
              <p className="text-sm text-slate-600 mb-3">No classes enrolled</p>
              <button
                onClick={onEnrollClick}
                className="px-4 py-2 bg-teal-600 text-white text-xs font-medium rounded-lg hover:bg-teal-700 transition-colors cursor-pointer"
              >
                Enroll in Class
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {displayedClasses.map((cls) => (
                <div
                  key={cls.classid}
                  className="px-4 py-3 rounded-xl hover:bg-teal-50/50 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-teal-500 flex-shrink-0"></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-700 truncate">
                        {cls.classname}
                      </p>
                      <p className="text-xs text-slate-500">{cls.teachername}</p>
                    </div>
                  </div>
                </div>
              ))}

              {classes.length > 5 && (
                <p className="text-xs text-slate-500 text-center pt-2">
                  +{classes.length - 5} more classes
                </p>
              )}
            </div>
          )}

          {/* QR CODE SCAN BUTTON - Only show if enrolled in at least one class */}
          {classes.length > 0 && (
            <button
              onClick={onQRScan}
              className="w-full mt-4 px-4 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white text-sm font-semibold rounded-xl hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <QrCode className="w-4 h-4" />
              Scan QR Code
            </button>
          )}
        </div>
      </div>

      {/* Settings & Logout */}
      <div
        className={`bg-white transition-opacity duration-300 border-t border-slate-200 ${
          collapsed ? 'opacity-0' : 'opacity-100'
        } p-6`}
      >
        <div className="space-y-1">
          <button
            onClick={onSettings}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-teal-50 rounded-xl transition-colors cursor-pointer"
          >
            <Settings className="w-4 h-4 text-teal-600" />
            Settings
          </button>

          <button
            onClick={handleLogoutClick}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div
          className={`fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity duration-300 ${
            isLoggingOut ? 'opacity-0' : 'opacity-100'
          }`}
        >
          <div
            className={`bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transition-all duration-300 ${
              isLoggingOut ? 'scale-95 opacity-0' : 'scale-100 opacity-100'
            }`}
          >
            <div className="bg-gradient-to-r from-rose-600 to-red-600 px-8 py-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <LogOut className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Confirm Logout</h2>
                  <p className="text-rose-50 text-sm mt-1">
                    Are you sure you want to logout?
                  </p>
                </div>
              </div>
            </div>

            <div className="p-8">
              <p className="text-slate-700 mb-6">
                You will be redirected to the login page and will need to sign in again
                to access your classes.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  disabled={isLoggingOut}
                  className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmLogout}
                  disabled={isLoggingOut}
                  className="flex-1 px-4 py-3 bg-rose-600 text-white font-medium rounded-xl hover:shadow-lg transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoggingOut ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Logging out...
                    </>
                  ) : (
                    'Logout'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Logout Transition Overlay */}
      {isLoggingOut && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-700"
          style={{ zIndex: 99999 }}
        >
          <div className="text-center space-y-6">
            <div className="w-24 h-24 bg-white/10 rounded-full flex items-center justify-center mx-auto">
              <LogOut className="w-12 h-12 text-white animate-pulse" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-white mb-2">Logging Out...</h2>
              <p className="text-slate-300 text-lg">See you next time!</p>
            </div>
            <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        </div>
      )}
    </div>
  );
};
