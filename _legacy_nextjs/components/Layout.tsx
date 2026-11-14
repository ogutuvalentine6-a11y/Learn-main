import { ReactNode } from "react";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import Footer from "./Footer";

interface LayoutProps {
  role: "student" | "staff" | "admin";
  name?: string;
  children: ReactNode;
}

export default function Layout({ role, name, children }: LayoutProps) {
  return (
    <div className="flex min-h-screen flex-col bg-gray-100">
      <Navbar role={role} name={name} />
      <div className="mx-auto flex w-full max-w-7xl flex-1">
        <Sidebar role={role} />
        <main className="flex-1 p-6">{children}</main>
      </div>
      <Footer />
    </div>
  );
}
