'use client'
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Package, Users, ArrowRightLeft, CreditCard, FileText, Banknote } from "lucide-react";

const navItems = [
  { href: "/products", label: "Products", icon: Package },
  { href: "/parties", label: "Parties", icon: Users },
  { href: "/sales", label: "New Sale", icon: ArrowRightLeft },
  { href: "/purchases", label: "New Purchase", icon: ArrowRightLeft },
  { href: "/payments", label: "New Payment", icon: CreditCard },
  { href: "/reports", label: "Reports", icon: FileText },
  { href: "/transactions", label: "Transactions", icon: Banknote }, // ✨ ADD THIS LINE

];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 flex-shrink-0 border-r bg-gray-50 p-4">
      <div className="flex items-center mb-8">
        <Link href="/" className="text-2xl font-bold tracking-tight">Inventory</Link>
      </div>
      <nav className="flex flex-col space-y-2">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center space-x-3 rounded-md px-3 py-2 text-sm font-medium",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-gray-600 hover:bg-gray-100",
                item.label.includes("Sale") && "text-green-600",
                item.label.includes("Purchase") && "text-red-600"
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
