"use client";

import { useRouter, usePathname } from "next/navigation";
import { ListGroup } from "react-bootstrap";

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();

  const navItems = [
    { label: "Home", path: "/dashboard" },
    // { label: "Team", path: "/dashboard/leads" },
  ];

  return (
    <ListGroup className='rounded-0 border-0'>
      {navItems.map((item) => (
        <ListGroup.Item
          className='border-0 rounded m-0 bg-transparent'
          key={item.path}
          action
          active={pathname === item.path}
          onClick={() => router.push(item.path)}
        >
          {item.label}
        </ListGroup.Item>
      ))}
    </ListGroup>
  );
}