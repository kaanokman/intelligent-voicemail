import Sidebar from "@/components/Sidebar";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className='h-100 flex'>
      <div className="flex h-100 flex-col bg-light border-end z-1 position-fixed pp-2"
        style={{ width: "200px", minWidth: "200px" }}>
        <Sidebar />
      </div>
      <div className="flex flex-1">
        <div style={{ marginLeft: 200 }} className="flex p-3 z-0 flex-1 gap-3">
          {children}
        </div>
      </div>
    </div>
  );
}
