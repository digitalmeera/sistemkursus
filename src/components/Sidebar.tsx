import React from 'react';
import { BrandLogo } from './ui';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  ClipboardList,
  QrCode,
  FileSpreadsheet,
  Settings,
  LogOut,
  X,
  ExternalLink
} from 'lucide-react';

export type ActivePage = 
  | 'dashboard'
  | 'peserta'
  | 'kartu'
  | 'monitoring'
  | 'absensi'
  | 'laporan'
  | 'pengaturan';

interface SidebarProps {
  activePage: ActivePage;
  onSelectPage: (page: ActivePage) => void;
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
  appTitle?: string;
  footerText?: string;
  logo?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activePage,
  onSelectPage,
  isOpen,
  onClose,
  onLogout,
  appTitle = 'DIGITALMEERA',
  footerText = '© DIGITALMEERA',
  logo = '',
}) => {
  const menuItems: Array<{ id: ActivePage; label: string; hint: string; icon: React.FC<{ className?: string }> }> = [
    { id: 'dashboard', label: 'Dashboard', hint: 'Ringkasan', icon: LayoutDashboard },
    { id: 'peserta', label: 'Data Peserta', hint: 'Pendaftaran', icon: Users },
    { id: 'kartu', label: 'Kartu Peserta', hint: 'Cetak', icon: CreditCard },
    { id: 'absensi', label: 'Absensi', hint: 'Scanner', icon: QrCode },
    { id: 'monitoring', label: 'Monitoring', hint: 'Kehadiran', icon: ClipboardList },
    { id: 'laporan', label: 'Laporan', hint: 'Export', icon: FileSpreadsheet },
    { id: 'pengaturan', label: 'Pengaturan', hint: 'Sistem', icon: Settings },
  ];

  return (
    <>
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex w-60 flex-col border-r border-[#e3e9ef] bg-white transition-transform duration-200 lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-14 items-center justify-between border-b border-[#e3e9ef] px-4">
          <div className="flex items-center gap-2.5">
            <BrandLogo
              src={logo}
              boxClassName="h-8 w-8 rounded-md border border-[#e3e9ef] bg-white"
            />
            <div>
              <h1 className="text-[13px] font-semibold tracking-tight text-[#1a2430] leading-none">
                {appTitle}
              </h1>
              <p className="mt-1 text-[10px] font-medium uppercase tracking-wide text-[#8494a5]">
                Kursus & Absensi
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-[#4b5a6a] hover:bg-[#f0f3f6] lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-2.5 py-3">
          <nav className="space-y-0.5">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activePage === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onSelectPage(item.id);
                    onClose();
                  }}
                  className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-[13px] transition-colors ${
                    isActive
                      ? 'bg-[#eef5fb] font-semibold text-[#0f4c73]'
                      : 'font-medium text-[#4b5a6a] hover:bg-[#f4f6f8] hover:text-[#1a2430]'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1">{item.label}</span>
                  <span className="text-[10px] font-normal text-[#8494a5]">{item.hint}</span>
                </button>
              );
            })}
          </nav>

          <div className="mt-3 border-t border-[#e3e9ef] pt-3">
            <a
              href="/pendaftaran.html"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between rounded-md border border-[#e3e9ef] px-2.5 py-2 text-[12px] font-semibold text-[#0f4c73] hover:bg-[#f4f6f8]"
              title="Buka form pendaftaran mandiri"
            >
              <span>Pendaftaran Mandiri</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>

        <div className="border-t border-[#e3e9ef] p-2.5">
          <button
            type="button"
            onClick={onLogout}
            className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-medium text-[#4b5a6a] hover:bg-[#fdf0f0] hover:text-[#a02a2a]"
          >
            <LogOut className="h-4 w-4" />
            <span>Keluar</span>
          </button>
          <p className="mt-2 truncate px-2.5 text-center text-[10px] text-[#8494a5]">
            {footerText}
          </p>
        </div>
      </aside>
    </>
  );
};
